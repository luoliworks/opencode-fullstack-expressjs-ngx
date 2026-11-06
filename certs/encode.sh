#!/bin/bash
set -e

cd "$(dirname "$0")"

# 1. 生成包含 192.168.2.x 和 192.168.8.x 网段的 req.cnf
cat > req.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CA
ST = Ontario
L = Toronto
O = Luo
OU = Li
CN = www.localhost.com

[v3_req]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, digitalSignature, keyEncipherment, keyCertSign
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = www.localhost.com
DNS.2 = localhost.com
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

idx=2

# 追加 192.168.2.1 到 192.168.2.254
for i in $(seq 1 254); do
  echo "IP.$idx = 192.168.2.$i" >> req.cnf
  idx=$((idx + 1))
done

# 追加 192.168.8.1 到 192.168.8.254
for i in $(seq 1 254); do
  echo "IP.$idx = 192.168.8.$i" >> req.cnf
  idx=$((idx + 1))
done

# 2. 生成证书和私钥
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout cert.key -out cert.pem \
  -config req.cnf -sha256 -extensions v3_req

echo "Done! Generated certs/req.cnf, certs/cert.key, and certs/cert.pem"
