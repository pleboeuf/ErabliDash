FROM node:6
RUN mkdir -p /usr/src/app
WORKDIR /home/app
COPY . /home/app
RUN groupadd -r app && \
    useradd -r -g app app && \
    chown -R app:app /home/app && \
    npm install bower -g && \
    su app -c "npm install" && \
    su app -c "bower install"
VOLUME ["/data"]
EXPOSE 3000
USER app
CMD [ "node", "app"]

