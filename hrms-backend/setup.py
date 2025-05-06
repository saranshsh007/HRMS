from setuptools import setup, find_packages

setup(
    name="hrms-backend",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pymysql",
        "pydantic",
        "passlib[bcrypt]",
        "python-multipart",
        "email-validator"
    ],
) 