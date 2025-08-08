import os
import argparse
import glob
import shutil
import time
import platform
import shutil

import requests
import os
import zipfile
import secrets
import string

# generate random app key
app_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))


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


def prepare_env_file(unpack_location):
    content = ""

    content += f"# Node info\n"
    content += f"NODE_NAME={node_name}\n"
    content += f"YAGNA_AUTOCONF_APPKEY={app_key}\n"
    content += f"YAGNA_APPKEY={app_key}\n"
    content += f"YAGNA_AUTOCONF_ID_SECRET={private_key}\n"
    content += "\n"
    content += "YAGNA_DATADIR=yagnadir\n"
    content += f"YAGNA_API_URL=http://127.0.0.1:{api_port}\n"
    content += f"GSB_URL=unix:{yagna_base_path}/yagna.sock\n"
    content += "\n"
    content += f"YA_NET_BIND_URL=udp://0.0.0.0:{udp_port}\n"
    content += f"YAGNA_API_ALLOW_ORIGIN=*\n"
    content += "\n"

    env_file_path = f"{unpack_location}/.env"
    with open(env_file_path, "w") as env_file:
        env_file.write(content)


def prepare_client_env_file(target_dir):
    content = ""

    content += f"YAGNA_APPKEY={app_key}\n"
    content += f"YAGNA_API_URL=http://127.0.0.1:{api_port}\n"
    content += f"YAGNA_API_BASEPATH=http://127.0.0.1:{api_port}\n"
    content += f"STATUS_SERVER=http://0.0.0.0:{status_port}\n"
    content += f"EFFICIENCY_LOWER_THRESHOLD=1.0\n"
    content += f"SPEED_LOWER_THRESHOLD=1000000\n"
    content += f"SPEED_ESTIMATION_TIMEFRAME=600\n"
    content += f"MINIMUM_CPU_CORES=8\n"
    content += f"GOLEM_PINO_LOG_LEVEL=info\n"
    content += f"YAGNA_ID={yagna_id}\n"

    content += "\n"

    env_file_path = target_dir + "/cli/.env"
    if os.path.exists(env_file_path):
        print("Cli .env file already exists, not overwriting.")
    with open(env_file_path, "w") as env_file:
        env_file.write(content)


def prepare_pre_release(target_dir):
    system = platform.system()

    yagna_version = "pre-rel-v0.17.1-allocation4"
    unpack_location = target_dir

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

    prepare_env_file(unpack_location)


# get base path of the current script
base_path = os.path.dirname(os.path.abspath(__file__))
print(base_path)

# Parse command-line arguments
parser = argparse.ArgumentParser(
    description="Generate a yagna service name based on the provided template."
)
parser.add_argument(
    "--node-name",
    required=True,
    help="The yagna service name to replace in templates.",
)
parser.add_argument(
    "--overwrite",
    action="store_true",
    help="Overwrite existing files without prompting.",
)
parser.add_argument(
    "--install-services",
    action="store_true",
    help="Install the generated services after creation.",
)
parser.add_argument(
    "--clone-repo",
    action="store_true",
    help="Clone the vanity repository.",
)
parser.add_argument(
    "--prepare-yagna",
    action="store_true",
    help="Prepare yagna also.",
)
parser.add_argument(
    "--udp-port",
    type=int,
    default=11600,
)
parser.add_argument(
    "--api-port",
    type=int,
    default=9000,
    help="Port for the yagna API (default: 9000).",
)
parser.add_argument(
    "--status-port",
    type=int,
    default=7877,
    help="Port for the status server (default: 7877).",
)
parser.add_argument(
    "--private-key",
    type=str,
    default="",
    help="Private key for the node (default: empty).",
)
parser.add_argument(
    "--yagna-id",
    type=str,
    default="0x555566e762ce208cceb69cae859f7a0673725d44",
)

args = parser.parse_args()
api_port = args.api_port
status_port = args.status_port
udp_port = args.udp_port
node_name = args.node_name
yagna_service_name = "yagna-" + node_name
vanity_service_name = "vanity-" + node_name
private_key = args.private_key
service_base_path = os.path.join(base_path, "services", node_name)
yagna_id = args.yagna_id
if os.name != "nt":
    service_install_path = "/etc/systemd/system"

if args.install_services:
    if os.name != "nt":
        print(f"Stopping existing services if running... {vanity_service_name}")
        os.system(f"sudo systemctl stop {vanity_service_name}")
        print(f"Stopping existing services if running... {yagna_service_name}")
        os.system(f"sudo systemctl stop {yagna_service_name}")
        print("Existing services stopped.")

if os.path.exists(service_base_path):
    if args.overwrite:
        print(f"Overwriting existing service directory: {service_base_path}")
    else:
        raise FileExistsError(
            f"Service directory already exists: {service_base_path}. "
            "Use --overwrite to overwrite."
        )
    shutil.rmtree(service_base_path)
    time.sleep(1)

os.makedirs(service_base_path, exist_ok=False)
os.makedirs(os.path.join(service_base_path, "services"), exist_ok=False)

yagna_base_path = os.path.join(service_base_path, "yagna")
# Iterate over all *.template files

git_clone_path = os.path.join(service_base_path, "golem-vanity.market")

for (dirpath, dirnames, filenames) in os.walk("templates"):
    for filename in filenames:
        if filename.endswith(".template"):
            template_file = filename
            template_file_path = os.path.join(dirpath, template_file)
            with open(template_file_path, "r") as f:
                content = f.read()

            # Replace placeholder
            updated_content = content.replace("%%YAGNA_SERVICE_NAME%%", yagna_service_name)
            updated_content = updated_content.replace("%%VANITY_SERVICE_NAME%%", vanity_service_name)
            updated_content = updated_content.replace("%%NODE_NAME%%", node_name)
            updated_content = updated_content.replace("%%YAGNA_ROOT_DIR%%", yagna_base_path)
            updated_content = updated_content.replace("%%CLI_ROOT_DIR%%", os.path.join(git_clone_path, "cli"))

            output_file = template_file.replace(".template", "")

            # Write updated file
            if template_file.endswith(".service.template"):
                output_file_path = os.path.join(service_base_path, "services",
                                                output_file.replace(".service", "-" + node_name + ".service"))
            else:
                output_file_path = os.path.join(service_base_path, output_file)
            with open(output_file_path, "w") as f:
                f.write(updated_content)

            if os.name != 'nt':  # Not Windows
                os.chmod(output_file_path, 0o755)

            print(f"Processed: {template_file} -> {output_file}")

if os.name != "nt":
    repo_path = "git@github.com:Unoperate/golem-vanity.market.git"
else:
    repo_path = "https://github.com/Unoperate/golem-vanity.market.git"

if args.clone_repo:
    print("Cloning vanity repository...")
    command = "git clone " + repo_path + " " + git_clone_path
    print(command)
    os.system(command)
    os.system(f"(cd {git_clone_path} && git checkout scx1332/vanity-runner)")

if args.prepare_yagna:
    print("Preparing yagna pre-release...")
    prepare_pre_release(yagna_base_path)
    prepare_client_env_file(git_clone_path)

if args.install_services:
    if os.name != "nt":
        print(f"Installing services to {service_install_path}")
        for service_file in glob.glob(os.path.join(service_base_path, "services", "*.service")):
            os.system("sudo cp {} {}".format(service_file, service_install_path))
            print(f"Installed: {service_file} to {service_install_path}")

        os.system("sudo systemctl daemon-reload")
    else:
        print("Service installation is not supported on Windows.")

if os.name != "nt":
    cli_path = os.path.join(git_clone_path, "cli")
    os.system(f"(cd {cli_path} && npm install && npm run prebuild && npm run db:setup)")
    shutil.copy("generated.pub", os.path.join(cli_path, "generated.pub"))

if args.install_services:
    if os.name != "nt":
        print(f"Starting services: {yagna_service_name}")
        os.system(f"sudo systemctl start {yagna_service_name}")
        time.sleep(15)
        print(f"Starting vanity service: {vanity_service_name}")
        os.system(f"sudo systemctl start {vanity_service_name}")
