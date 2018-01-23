# Releasing a new build of Quaternion

Quaternion can be released automatically on dokku-compatible hosts. Quaternion will be built within the docker container as part of Dokku's predeployment step. To do this, simply run:

`git push dokku`

(this assumes that you have a suitable dokku remote configured)
