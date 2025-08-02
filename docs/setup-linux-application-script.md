# Setup linux application script

# snap
apt install snapd
systemctl enable snapd
systemctl start snapd

snap install intellij-idea-ultimate --classic
snap install telegram-desktop
snap install skype
snap install postman

# vscode
wget https://az764295.vo.msecnd.net/stable/97dec172d3256f8ca4bfb2143f3f76b503ca0534/code_1.74.3-1673284829_amd64.deb
apt-get install ./code_1.74.3-1673284829_amd64.deb -y

# chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get install ./google-chrome-stable_current_amd64.deb -y

# dbeaver

# redis insight
wget https://download.redisinsight.redis.com/latest/RedisInsight-v2-linux-amd64.deb
apt-get install ./RedisInsight-v2-linux-amd64.deb -y

# JDK
apt-get install openjdk-11-jdk -y
apt-get install openjdk-17-jdk -y
# GO
apt install golang-go -y
go version

# mongocompass
wget https://downloads.mongodb.com/compass/mongodb-compass_1.35.0_amd64.deb
apt-get install ./mongodb-compass_1.35.0_amd64.deb -y

# remove unused packages
```python
import os
from typing import List

def read_lines(filename: str) -> list:
    lines = []
    with open(filename) as f:
        for line in f:
            line = line.removesuffix("\n")
            lines.append(line)
        lines.sort()
    try:
        lines.remove("")
    except:
        pass
    return lines


def write_final_file(lines, filename="list-rm-final.txt") -> None:
    with open(filename, "w") as f:
        f.writelines("\n".join(lines))


def create_command(lines: List[str]) -> List[str]:
    cmds = []
    for line in lines:
        cmd = "sudo apt-get purge -y " + line
        cmds.append(cmd)
    return cmds


if __name__ == "__main__":
    lines = read_lines("list-remove.txt")
    write_final_file(lines)
    cmds = create_command(lines)
    print(cmds)
    for cmd in cmds:
        os.system(cmd)
```