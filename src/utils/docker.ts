import Docker, { Container } from "dockerode";
import { pack as tarPack, extract as tarExtract } from "tar-stream";
import { createPatch } from "diff";

export const getRunningContainer = async (docker: Docker, id: string): Promise<Container> => {
    const container = docker.getContainer(id);

    let containerInfo: Docker.ContainerInspectInfo;
    try {
        containerInfo = await container.inspect();
    } catch (error) {
        throw new Error(`Failed to inspect container ${id}: ${error}`);
    }

    if (!containerInfo.State.Running) {
        throw new Error(`Container ${id} is not running`);
    }

    return container;
}

export const executeInContainer = async (
    container: Container,
    command: string,
    pwd: string,
    timeoutMs = 5000,
): Promise<string> => {
    const exec = await container.exec({
        Cmd: ["/bin/bash", "-c", command],
        WorkingDir: pwd,
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start({});

    return new Promise((resolve, reject) => {
        let logs = "";

        const timeout = setTimeout(() => {
            stream.destroy();
            logs += "[TIMEOUT] Command exceeded time limit\n";
            resolve(logs.trim());
        }, timeoutMs);

        const handleData = (chunk: any) => {
            const data = chunk.toString();
            logs += `${data}\n`;
        };

        const handleStreamEnd = () => {
            clearTimeout(timeout);
            resolve(logs.trim());

        };
        const handleError = (err: unknown) => {
            clearTimeout(timeout);
            reject(err);
        };

        stream.on("data", handleData);
        stream.on("end", handleStreamEnd);
        stream.on("error", handleError);
    });
};


export const readFileFromContainer = async (
    container: Container,
    path: string,
): Promise<string> => {
    const exec = await container.exec({
        Cmd: ["cat", path],
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start({});

    return new Promise((resolve, reject) => {
        let output = "";
        let errorOutput = "";

        stream.on("data", (chunk) => {
            // Docker multiplexes stdout/stderr in the first byte
            if (chunk[0] === 1) output += chunk.slice(8).toString();
            if (chunk[0] === 2) errorOutput += chunk.slice(8).toString();
        });

        stream.on("end", () => {
            if (errorOutput) {
                reject(new Error(`Error reading file: ${errorOutput}`));
            } else {
                resolve(output);
            }
        });

        stream.on("error", (err) => reject(err));
    });
};

export const writeFileToContainer = async (
    container: Container,
    path: string,
    content: string,
    append = false,
) => {
    try {
        if (append) {
            // If appending, we need to read the existing content first
            const existingContent = await readFileFromContainer(container, path).catch(() => "");
            content = existingContent + content;
        }

        const contentBuffer = Buffer.from(content);

        const pack = tarPack();

        const pathParts = path.split("/");
        const fileName = pathParts.pop();
        if (!fileName) {
            throw new Error(`Invalid path: ${path}`);
        }
        const dirPath = pathParts.join("/");

        pack.entry({ name: fileName, mode: 0o644 }, contentBuffer);
        pack.finalize();

        const chunks = [];
        for await (const chunk of pack) {
            chunks.push(chunk);
        }
        const tarBuffer = Buffer.concat(chunks);

        await container.putArchive(tarBuffer, { path: dirPath || "/" });

    } catch (err) {
        throw new Error(`Failed to write to file ${path}: ${err}`);
    }
};

export const modifyFileInContainer = async (
    container: Container,
    path: string,
    newContent: string,
    append = false,
): Promise<string> => {
    try {
        // Get the original content
        const originalContent = await readFileFromContainer(container, path).catch(() => "");

        // If content is the same, return empty diff
        if (originalContent === newContent) {
            return "";
        }

        // Write new content to file
        await writeFileToContainer(container, path, newContent, append);

        newContent = await readFileFromContainer(container, path);

        // Generate unified diff
        const diffResult = createPatch(
            path,
            originalContent,
            newContent,
            "Original",
            "Modified"
        );

        return diffResult;
    } catch (err) {
        throw new Error(`Failed to modify file ${path} in container ${container.id}: ${err}`);
    }
};

export const readBinFileFromContainer = async (container: Container, path: string): Promise<Buffer> => {
    // Use Docker's API to get the file content directly
    const data = await container.getArchive({ path });

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        data.on("data", (chunk) => {
            chunks.push(chunk);
        });

        data.on("end", () => {
            try {
                // The getArchive method returns a tar stream, so we need to extract the file
                const extract = tarExtract();
                const concatBuffer = Buffer.concat(chunks);

                extract.on("entry", (header, stream, next) => {
                    const fileChunks: Buffer[] = [];

                    stream.on("data", (chunk) => {
                        fileChunks.push(chunk);
                    });

                    stream.on("end", () => {
                        // This is our file content
                        const fileContent = Buffer.concat(fileChunks);
                        resolve(fileContent);
                        next();
                    });

                    stream.resume();
                });

                extract.end(concatBuffer);
            } catch (err) {
                reject(err);
            }
        });

        data.on("error", (err) => {
            reject(err);
        });
    });
};
