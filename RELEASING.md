# Releasing a new build of Quaternion

First of all, make a production build:

`npm run-script webpack`

Then commit the bundle.js

Finally, push to dokku:

`git push dokku`

The released build is then automatically made available at http://quaternion.sarvva.moos.es/
