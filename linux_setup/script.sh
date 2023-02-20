#!/bin/bash

clean(){
    echo "clean all .deb package"
    rm *.deb || true
    rm *.tar* || true
}

jvm(){
    apt-get install openjdk-11-jdk -y
    apt-get install openjdk-17-jdk -y
}

node(){
    echo "install nodejs"
    wget https://nodejs.org/dist/v19.6.1/node-v19.6.1-linux-x64.tar.xz
    tar -xf node-v19.6.1-linux-x64.tar.xz --directory=/usr/local --strip-components=1
}

go(){
    apt install golang-go -y
    go version
}

snap(){
    apt install snapd
    systemctl enable snapd
    systemctl start snapd
    
    snap install intellij-idea-ultimate --classic
    snap install telegram-desktop
    snap install skype
    snap install postman
}

deb(){
    while read url; do
        wget "$url"
    done < debs.txt
    dpkg -i *.deb
}

nvim(){
    wget https://github.com/neovim/neovim/releases/download/nightly/nvim.appimage
    sudo mv nvim.appimage /usr/local/nvim
    chmod +x /usr/local/bin/nvim
    export CUSTOM_NVIM_PATH=/usr/local/bin/nvim
    sudo update-alternatives --install /usr/bin/nvim nvim "${CUSTOM_NVIM_PATH}" 110
    git clone https://github.com/TikTzuki/nvim.git ~/.config/nvim
}

ibus(){
    echo "hello ibus"
}

clean

if [[ "$1" == "" ]]; then
    echo "run all"
else
    $1
fi