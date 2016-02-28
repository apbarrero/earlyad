#!/usr/bin/env node

var EarlyAd = require('../lib/earlyad');
var assert = require('chai').assert;

describe('Early adopter', function() {

   var ea = new EarlyAd({ token: process.env.GITHUB_TOKEN });

   describe('isNewerVersion', function() {

      it('should return true if new version is greater than current', function() {
         assert.ok(ea.isNewerVersion('1.2.3', '1.2.2'));
         assert.ok(ea.isNewerVersion('1.4.1', '1.3.1'));
         assert.ok(ea.isNewerVersion('2.3.1', '1.3.1'));
         assert.ok(ea.isNewerVersion('1.4.1', '1.3.12'));
         assert.ok(ea.isNewerVersion('1.15.0', '1.8.12'));
         assert.ok(ea.isNewerVersion('2.0.0', '1.8.10'));
         assert.ok(ea.isNewerVersion('10.0.0', '9.2.18'));
      });
      it('should return false if new version is lesser than current', function() {
         assert.notOk(ea.isNewerVersion('1.2.1', '1.2.2'));
         assert.notOk(ea.isNewerVersion('1.4.1', '1.5.1'));
         assert.notOk(ea.isNewerVersion('2.3.1', '3.3.1'));
         assert.notOk(ea.isNewerVersion('1.4.12', '1.5.1'));
         assert.notOk(ea.isNewerVersion('1.0.15', '1.2.1'));
         assert.notOk(ea.isNewerVersion('2.9.0', '3.0.10'));
         assert.notOk(ea.isNewerVersion('9.1.12', '10.0.1'));
      });
      it('should return false if any parameter is non-compliant with semantic version', function() {
         assert.notOk(ea.isNewerVersion('1.2.3', 'foo'));
         assert.notOk(ea.isNewerVersion('foo', '1.2.3'));
         assert.notOk(ea.isNewerVersion('foo', 'bar'));
         assert.notOk(ea.isNewerVersion('1.2.3', '1.0'));
         assert.notOk(ea.isNewerVersion('1.0', '1.2.3'));
         assert.notOk(ea.isNewerVersion('1.0', '1.0'));
         assert.notOk(ea.isNewerVersion('1.2.3', '42'));
         assert.notOk(ea.isNewerVersion('42', '1.2.3'));
         assert.notOk(ea.isNewerVersion('42', '42'));
         assert.notOk(ea.isNewerVersion('1.2.3', '1.2.3foo'));
         assert.notOk(ea.isNewerVersion('1.2.3foo', '1.2.3'));
         assert.notOk(ea.isNewerVersion('1.2.3foo', '1.2.3foo'));
      });
   });

   describe('checkDepVersion', function() {

      describe('with git URLs', function() {

         var pack = {
            "name": "foo",
            "version": "1.0.0",
            "dependencies": {
               "bar": "git://github.com/baz/bar.git#1.0.0",
               "bar2": "baz/bar2#1.2.3"
            }
         };

         it('should return updated list of dependencies if dependency is listed within package with a lesser version', function() {
            assert.deepEqual(
               ea.checkDepVersion(pack, { url: "git://github.com/baz/bar.git", version: "1.0.1" }),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "bar": "git://github.com/baz/bar.git#1.0.1",
                     "bar2": "baz/bar2#1.2.3"
                  }
               }
            );
            assert.deepEqual(
               ea.checkDepVersion(pack, { url: "git://github.com/baz/bar2.git", version: "1.3.0" }),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "bar": "git://github.com/baz/bar.git#1.0.0",
                     "bar2": "baz/bar2#1.3.0"
                  }
               }
            );
         });
         it('should return null if dependency is listed within package with a greater version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "git://github.com/baz/bar.git", version: "0.9.0" }));
            assert.isNull(ea.checkDepVersion(pack, { url: "git://github.com/baz/bar2.git", version: "1.1.10" }));
         });
         it('should return null if dependency is listed within package with the same version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "git://github.com/baz/bar.git", version: "1.0.0" }));
            assert.isNull(ea.checkDepVersion(pack, { url: "git://github.com/baz/bar2.git", version: "1.2.3" }));
         });
         it('should return null if dependency is not included in package dependencies', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "git://github.com/baz/notfound.git", version: "1.0.0" }));
         });
         it('should return null if dependency version is not valid semantic version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "git://github.com/baz/bar.git", version: "invalid version" }));
         });
      });

      describe('with github \'user/repo\' URLs', function() {
         var pack = {
            "name": "foo",
            "version": "1.0.0",
            "dependencies": {
               "bar": "git://github.com/baz/bar.git#1.0.0",
               "bar2": "baz/bar2#1.2.3"
            }
         };

         it('should return updated list of dependencies if dependency is listed within package with a lesser version', function() {
            assert.deepEqual(
               ea.checkDepVersion(pack, { url: "git://github.com/baz/bar.git", version: "1.0.1" }),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "bar": "git://github.com/baz/bar.git#1.0.1",
                     "bar2": "baz/bar2#1.2.3"
                  }
               }
            );
            assert.deepEqual(
               ea.checkDepVersion(pack, { url: "git://github.com/baz/bar2.git", version: "1.3.0" }),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "bar": "git://github.com/baz/bar.git#1.0.0",
                     "bar2": "baz/bar2#1.3.0"
                  }
               }
            );
         });
         it('should return null if dependency is listed within package with a greater version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar", version: "0.9.0" }));
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar2", version: "1.1.10" }));
         });
         it('should return null if dependency is listed within package with the same version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar", version: "1.0.0" }));
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar2", version: "1.2.3" }));
         });
         it('should return null if dependency is not included in package dependencies', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/notfound", version: "1.0.0" }));
         });
         it('should return null if dependency version is not valid semantic version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar", version: "invalid version" }));
         });
      });

      describe('with package dependencies that have URLs without semantic version', function() {
         var pack = {
            "name": "foo",
            "version": "1.0.0",
            "dependencies": {
               "bar": "git://github.com/baz/bar.git",
               "bar2": "git://github.com/baz/bar2.git#branch",
               "bar3": "baz/bar3",
               "bar4": "baz/bar4#branch"
            }
         };

         it('should return null if dependency in package dependencies has no version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar", version: "1.2.3" }));
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar3", version: "1.2.3" }));
         });
         it('should return null if dependency in package dependencies has an invalid semantic version', function() {
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar2", version: "1.2.3" }));
            assert.isNull(ea.checkDepVersion(pack, { url: "baz/bar4", version: "1.2.3" }));
         });
      });
   });

   describe('extractUserRepo', function() {
      it('should extract user and repo name from full github URL', function() {
         assert.deepEqual(
            ea.extractUserRepo('git://github.com/apbarrero/earlyad.git'),
            { user: 'apbarrero', repo: 'earlyad' }
         );
      });
      it('should extract user and repo name from abbreviated github URL', function() {
         assert.deepEqual(
            ea.extractUserRepo('apbarrero/earlyad'),
            { user: 'apbarrero', repo: 'earlyad' }
         );
      });
      it('should return null if an invalid url is passed', function() {
         assert.isNull(ea.extractUserRepo('this is not a valid URL'));
      });
   });

   describe('fetchPackageJson', function() {
      it('should return package.json contents for a github repository', function(done) {
         ea.fetchPackageJson('apbarrero/earlyad', function(err, res) {
            assert.isNull(err);
            assert.equal(res.name, 'earlyad');
            assert.equal(res.description, "Early adopter is a node.js dependency checker and updater");
            done();
         });
      });
   });

   describe('checkDepRepo', function() {
      var repo = 'git://github.com/apbarrero/earlyad.git';

      it('should return the repository package object with dependency list properly updated when one dependency needs to be updated', function(done) {
         var newSemver = { url: 'git://github.com/npm/node-semver.git', version: '99.99.99' };
         ea.checkDepRepo(repo, newSemver, function(err, res) {
            assert.isNull(err);
            var earlyadPack = res;
            assert.equal(earlyadPack.name, 'earlyad');
            assert.propertyVal(earlyadPack.dependencies, "semver", newSemver.url + "#" + newSemver.version);
            done();
         })
      });
      it('should return null if repo doesn\'t include the given dependency', function(done) {
         var newSemver = { url: 'git://github.com/dontdepend/onthis.git', version: '99.99.99' };
         ea.checkDepRepo(repo, newSemver, function(err, res) {
            assert.isNull(err);
            assert.isNull(res);
            done();
         });
      });
   });

   describe('checkDepRepoList', function() {
      var repolist = [
         "apbarrero/earlyad",
         "git://github.com/auth0/wt-cli.git"
      ];

      describe('when one repo in the list needs to update the dependency', function() {
         it('should return one package object with the updated dependency list', function(done) {
            var newSemver = { url: 'git://github.com/npm/node-semver.git', version: '99.99.99' };
            ea.checkDepRepoList(repolist, newSemver, function(err, res) {
                  assert.isNull(err);
                  assert.lengthOf(res, 1);
                  assert.equal(res[0].repo, 'apbarrero/earlyad');
                  var earlyadPack = res[0].pack;
                  assert.equal(earlyadPack.name, 'earlyad');
                  assert.propertyVal(earlyadPack.dependencies, "semver", newSemver.url + "#" + newSemver.version);
                  done();
            });
         });
      });
   });
});

