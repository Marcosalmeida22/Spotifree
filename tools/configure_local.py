"""Configura únicamente la instancia SQL aislada de pruebas, en el puerto 3307."""
import secrets
from pathlib import Path
import mysql.connector

root=Path(__file__).resolve().parents[1]
if (root/'.env').exists():
    raise SystemExit('Ya existe .env: no se ha modificado.')
password=secrets.token_urlsafe(30)
admin_password=secrets.token_urlsafe(20)
with mysql.connector.connect(host='127.0.0.1',port=3307,user='root') as db:
    with db.cursor() as c:
        c.execute('CREATE DATABASE IF NOT EXISTS spotifree CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        c.execute("CREATE USER IF NOT EXISTS 'spotifree'@'127.0.0.1' IDENTIFIED BY %s",(password,))
        c.execute("ALTER USER 'spotifree'@'127.0.0.1' IDENTIFIED BY %s",(password,))
        c.execute("GRANT ALL PRIVILEGES ON spotifree.* TO 'spotifree'@'127.0.0.1'")
    db.commit()
(root/'.env').write_text(f'PORT=8000\nPYTHON_PORT=8001\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3307\nMYSQL_DATABASE=spotifree\nMYSQL_USER=spotifree\nMYSQL_PASSWORD={password}\nSESSION_SECRET={secrets.token_hex(32)}\nADMIN_EMAIL=admin@spotifree.local\nADMIN_PASSWORD={admin_password}\nYOUTUBE_API_KEY=\n',encoding='utf-8')
print('Instancia local configurada. Credenciales guardadas en .env, sin mostrarlas ni incluirlas en Git.')
