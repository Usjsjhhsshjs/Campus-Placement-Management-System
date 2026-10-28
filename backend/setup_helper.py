import getpass
import secrets
import shutil
import sys
from pathlib import Path

import psycopg2
from psycopg2 import sql

HERE = Path(__file__).resolve().parent
HOST, PORT, APP_USER = "localhost", 5432, "campus_user"


def write_env(name, content):
    path = HERE / name
    if path.exists():
        shutil.copy(path, HERE / (name + ".bak"))
    path.write_text(content, encoding="utf-8")


def main():
    print("\nEnter the password you chose when you installed PostgreSQL (the 'postgres' user).")
    print("Nothing will show while you type. That is normal. Press Enter when done.\n")
    pg_password = getpass.getpass("PostgreSQL password: ")
    try:
        conn = psycopg2.connect(host=HOST, port=PORT, user="postgres", password=pg_password, dbname="postgres")
    except psycopg2.OperationalError as err:
        if "password authentication failed" in str(err):
            print("\nERROR: That password is wrong. Run this again and type the correct password.")
        else:
            print("\nERROR: Could not reach PostgreSQL on this computer.")
            print("Make sure PostgreSQL is installed and running (Windows Start -> Services -> postgresql -> Start).")
        return 1

    conn.autocommit = True
    app_password = secrets.token_hex(12)
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (APP_USER,))
        verb = "ALTER ROLE {} WITH LOGIN PASSWORD %s" if cur.fetchone() else "CREATE ROLE {} WITH LOGIN PASSWORD %s"
        cur.execute(sql.SQL(verb).format(sql.Identifier(APP_USER)), (app_password,))
        for db in ("campusconnect", "campusconnect_test"):
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db,))
            if not cur.fetchone():
                cur.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(sql.Identifier(db), sql.Identifier(APP_USER)))
    conn.close()

    url = f"postgresql+psycopg2://{APP_USER}:{app_password}@{HOST}:{PORT}"
    write_env(".env", (
        f"DATABASE_URL={url}/campusconnect\n"
        f"SECRET_KEY={secrets.token_urlsafe(48)}\n"
        "ACCESS_TOKEN_EXPIRE_MINUTES=1440\n"
        "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n"
        "FRONTEND_URL=http://localhost:5173\n"
        "UPLOAD_DIR=uploads\n"
        "APP_ENV=development\n"
        "RESEND_API_KEY=\n"
        "EMAIL_FROM=\n"
    ))
    write_env(".env.test", f"TEST_DATABASE_URL={url}/campusconnect_test\n")
    print("\nDatabase and settings are ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())