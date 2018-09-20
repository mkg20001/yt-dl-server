# yt-dl-server

Yet another YouTube download server

## Installation

You can either install this using npm or as a snap (recommended):

 - npm: `$ npm i -g mkg20001/yt-dl-server`
 - snap: `$ snap install --edge yt-dl-server`

## Usage

You need mongodb and redis installed

For most usecases just running `yt-dl-server` should be enough.

Full help:

```
Options:
  --help           Show help                                           [boolean]
  --version        Show version number                                 [boolean]
  --host           Host to listen on                    [string] [default: "::"]
  --port           Port to listen on                    [number] [default: 5344]
  --mongodb        MongoDB Url
                          [string] [default: "mongodb://localhost/yt-dl-server"]
  --redis          Redis Url                           [string] [default: "..."]
  --space          Maximum cache space usage in bytes (def 10GB)
                                                 [number] [default: 10737418240]
  --storage        Storage location       [string] [default: "/example/storage"]
  --cleanInterval  Cleaning interval in ms (def 1h)  [number] [default: 3600000]
```
