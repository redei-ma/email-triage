# Only Node runs here: the model is served by an Ollama outside the container
# (the host's, or the one in compose.ollama.yaml). No npm install, there are no
# runtime dependencies and Node runs the .ts files directly. The API key comes
# from compose, not from a .env copied into the image.
FROM node:24.21.0-slim

WORKDIR /app
COPY package.json ./
COPY src/ src/
COPY data/ data/

# The image's own unprivileged user; runs/ is the only place it writes.
RUN mkdir runs && chown node:node runs
USER node

ENTRYPOINT ["node", "src/evaluate.ts"]
CMD ["data/test"]
