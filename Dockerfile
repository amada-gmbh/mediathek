FROM python:3.12-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx cron curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/pdfs /app/data /var/www/html /var/log/nginx /run/nginx

WORKDIR /app

COPY sync/requirements.txt /app/sync/requirements.txt
RUN pip install --no-cache-dir -r /app/sync/requirements.txt

COPY sync/ /app/sync/
COPY frontend/ /var/www/html/
RUN mkdir -p /var/www/html/js/vendor /var/www/html/assets \
    && curl -fsSL -o /var/www/html/js/vendor/pdf.min.js \
         https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js \
    && curl -fsSL -o /var/www/html/js/vendor/pdf.worker.min.js \
         https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js \
    && curl -fsSL -o /var/www/html/js/vendor/qrcode.min.js \
         https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js
COPY data/manifest.sample.json /app/data/manifest.json
COPY data/manifest.demo.json /app/data/manifest.demo.json
COPY pdfs/demo-test_de.pdf /app/pdfs/demo-test_de.pdf
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY scripts/entrypoint.sh /entrypoint.sh
COPY scripts/run-sync-cron.sh /app/scripts/run-sync-cron.sh
COPY scripts/lang-api.py /app/scripts/lang-api.py

RUN chmod +x /entrypoint.sh /app/scripts/run-sync-cron.sh \
    && chown -R www-data:www-data /var/www/html /app/pdfs /app/data

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=600s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
