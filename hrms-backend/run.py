import os
import sys
from pathlib import Path

# Get the absolute path of the project root
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", 
                host="127.0.0.1", 
                port=8000, 
                reload=True,
                reload_dirs=[str(project_root)]) 