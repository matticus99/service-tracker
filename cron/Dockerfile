FROM alpine:3.19
RUN apk add --no-cache curl
COPY crontab /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
