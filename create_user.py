"""Create or update a login for the website from the command line.

Run:  python create_user.py <username>
The password is prompted for (or pass --password for scripted use).
"""
import argparse
import getpass

from chat_server import USERS_FILE, save_user

parser = argparse.ArgumentParser()
parser.add_argument("username")
parser.add_argument("--password")
args = parser.parse_args()

password = args.password or getpass.getpass("Password: ")
if len(password) < 8:
    raise SystemExit("Password must be at least 8 characters.")

save_user(args.username, password, overwrite=True)
print(f"Saved user '{args.username}' to {USERS_FILE}")
