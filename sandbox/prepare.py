import platform
import shutil

import requests
import os
import zipfile


def download_file(url, save_path):
    try:
        # Send a GET request to the URL
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Raise an error for bad status codes

        # Create the directory if it doesn't exist
        # os.makedirs(os.path.dirname(save_path), exist_ok=True)

        # Write the file to the specified location
        with open(save_path, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)

        print(f"File downloaded successfully to: {save_path}")
        return True

    except Exception as e:
        print(f"Error downloading file: {e}")
        return False


def unzip_file(zip_path, extract_to):
    try:
        # Create extraction directory if it doesn't exist
        os.makedirs(extract_to, exist_ok=True)

        # Extract the zip file
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_to)

        print(f"File extracted successfully to: {extract_to}")
        return True

    except Exception as e:
        print(f"Error extracting file: {e}")
        return False


def prepare_env_file():
    content = ""

    content += "YAGNA_DATADIR=yagna-dir\n"
    content += "YAGNA_AUTOCONF_APPKEY=Y2TZTgGsD4HX\n"
    content += "YAGNA_APPKEY=Y2TZTgGsD4HX\n"

    content += "# TODO fill your ethereum account private key here\n"
    content += "YAGNA_AUTOCONF_ID_SECRET=%%YAGNA_AUTOCONF_ID_SECRET%%\n"
    content += "\n"

    content += "# Testnet for addressology\n"
    content += "YA_NET_TYPE=central\n"
    content += "CENTRAL_NET_HOST=polygongas.org:7999\n"
    content += "\n"

    env_file_path = "./yagna/.env"
    with open(env_file_path, "w") as env_file:
        env_file.write(content)


def prepare_client_env_file():
    content = ""

    content += "YAGNA_APPKEY=Y2TZTgGsD4HX\n"

    content += "\n"

    env_file_path = "../.env"
    with open(env_file_path, "w") as env_file:
        env_file.write(content)


# Example usage
if __name__ == "__main__":
    system = platform.system()

    yagna_version = "v0.17.3"
    unpack_location = "yagna"

    if os.path.exists(unpack_location):
        raise Exception(
            "Unpack location already exists. Please remove it before running this script."
        )

    if system == "Windows":
        file_url = f"https://github.com/golemfactory/yagna/releases/download/{yagna_version}/golem-requestor-windows-{yagna_version}.zip"
        save_location = f"golem-requestor-windows-{yagna_version}.zip"
        download_file(file_url, save_location)
        unzip_file(save_location, unpack_location)
        os.remove(save_location)
    elif system == "Linux":
        file_url = f"https://github.com/golemfactory/yagna/releases/download/{yagna_version}/golem-requestor-linux-{yagna_version}.tar.gz"
        save_location = f"golem-requestor-linux-{yagna_version}.zip"
        download_file(file_url, save_location)
        os.makedirs(unpack_location, exist_ok=True)
        os.system("tar -xzf " + save_location)
        os.system("mv " + f"golem-requestor-linux-{yagna_version}/* " + unpack_location)
        os.remove(save_location)
        shutil.rmtree(f"golem-requestor-linux-{yagna_version}")
    else:
        raise Exception(f"Unsupported OS: {system}")

    prepare_env_file()
    prepare_client_env_file()
