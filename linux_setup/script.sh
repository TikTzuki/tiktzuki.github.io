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
    wget https://github.com/neovim/neovim/releases/download/nightly/nvim-linux64.deb
    dpkg -i *.deb
    pip3 install pynvim
    npm i -g neovim
    apt install python3-pip fzf ranger ripgrep silversearcher-ag fd-find xsel -y
}

ibus(){
    echo "hello ibus"
}

clean

if [[ "$1" == "" ]]; then
    jvm
    node
    go
    snap
    deb
    nvim
    ibus
else
    $1
fi