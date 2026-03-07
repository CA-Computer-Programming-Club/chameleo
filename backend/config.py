import os
from dotenv import load_dotenv

load_dotenv()


SECRET_KEY = os.environ.get("CHAMELEO_SECRET_KEY")
if not SECRET_KEY:
    # Fall back to dev-only default, but print warning
    SECRET_KEY = "dev-insecure-secret-change-me"
    print(
        "WARNING: Using dev SECRET_KEY; set CHAMELEO_SECRET_KEY in env for production."
    )

ALGORITHM = "HS256"
