# (Deprecate) Profile
## TikTuzki [![TikTuzki](./img/tik-badge.svg)](https://github.com/TikTzuki/TikTzuki)

[<img alt="styled-components" src="./img/gear.png" height="50px" align="right"/>](https://styled-components.com)

> A collection of resources ☕

## Contents

- [Github sources](#github-sources)
    - [Roadmap](#roadmaps)
    - [Docker images repos](#docker-images-repos)
    - [Data structure and algorithms](#data-structure-and-algorithms)
    - [Springframework](#springframework)
    - [Microservice](#microservice)
- [Git commands](#git-commands)
- [Setup oracle_client](#setup-oracle_client)

---

### Github sources

#### Roadmaps

* [roadmap.sh](https://github.com/kamranahmedse/developer-roadmap) - Community driven roadmaps, articles and resources
  for developers.

#### Docker images repos

* [Docker Images from Oracle](https://github.com/oracle/docker-images) - This repository contains Dockerfiles and
  samples to build Docker images for Oracle commercial products.
* [docker-oracle-xe-11g](https://github.com/wnameless/docker-oracle-xe-11g) - Oracle Express Edition 11g Release 2 on Ubuntu 18.04 LTS.

#### Data structure and algorithms

* [Java algorithms & data structures](https://github.com/williamfiset/Algorithms) - Algorithms and data structures are
  fundamental to efficient code and good software design.

#### Springframework

* [Spring MVC Showcase](https://github.com/spring-attic/spring-mvc-showcase) - Demonstrates the capabilities of the
  Spring MVC web framework through small, simple examples.

#### Microservice

* [confluent-demo-scene](https://github.com/confluentinc/demo-scene) - Scripts and samples to support Confluent Platform
  talks. May be rough around the edges. For automated tutorials and QA'd code.

### Git commands

#### Unstage file:

```
git restore --staged [file_paths]
```

#### Changing the latest Git commit message

```
git commit --amend -m "New message"
git push --force remote-name branch-name
```

### Setup oracle_client

Download instantclient: \
https://www.oracle.com/database/technologies/instant-client.html \
Install packages:

```
sudo apt-get install libaio1 libaio-dev
```

_**Hang Out with People Who are Better than You.**_

Warren Buffett
