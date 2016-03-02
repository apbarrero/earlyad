#!/usr/bin/env node

var EarlyAd = require('../lib/earlyad');
var assert = require('chai').assert;

describe('Early adopter', function() {

   var ea = new EarlyAd(
      { url: 'apbarrero/earlyad', version: '1.2.3' },
      { token: process.env.GITHUB_TOKEN }
   );

   describe('isOldVersion', function() {

      it('should return true if new version is greater than parameter', function() {
         assert.ok(ea.isOldVersion('1.2.2'));
         assert.ok(ea.isOldVersion('1.1.3'));
         assert.ok(ea.isOldVersion('0.2.3'));
         assert.ok(ea.isOldVersion('0.0.12'));
         assert.ok(ea.isOldVersion('1.0.15'));
      });
      it('should return false if new version is lesser than parameter', function() {
         assert.notOk(ea.isOldVersion('1.2.4'));
         assert.notOk(ea.isOldVersion('1.3.0'));
         assert.notOk(ea.isOldVersion('2.0.0'));
         assert.notOk(ea.isOldVersion('1.4.1'));
         assert.notOk(ea.isOldVersion('1.15.0'));
         assert.notOk(ea.isOldVersion('10.0.0'));
      });
      it('should return false if parameter is non-compliant with semantic version', function() {
         assert.notOk(ea.isOldVersion('foo'));
         assert.notOk(ea.isOldVersion('1.0'));
         assert.notOk(ea.isOldVersion('42'));
         assert.notOk(ea.isOldVersion('1.2.3foo'));
      });
   });

   describe('checkDepVersion', function() {

      describe('with github full URLs', function() {

         var ea = new EarlyAd(
            { url: 'git://github.com/apbarrero/earlyad.git', version: '1.2.3' },
            { token: process.env.GITHUB_TOKEN }
         );

         it('should return updated list of dependencies if dependency is listed within package with full URL and a lesser version', function() {

            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "git://github.com/apbarrero/earlyad.git#1.0.0",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.deepEqual(
               ea.checkDepVersion(pack),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "earlyad": "git://github.com/apbarrero/earlyad.git#1.2.3",
                     "bar2": "baz/bar2#1.2.3"
                  }
               }
            );
         });
         it('should return updated list of dependencies if dependency is listed within package with short URL and a lesser version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#1.0.0",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.deepEqual(
               ea.checkDepVersion(pack),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "earlyad": "apbarrero/earlyad#1.2.3",
                     "bar2": "baz/bar2#1.2.3"
                  }
               }
            );
         });
         it('should return null if dependency is listed within package with a greater version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#2.0.1",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency is listed within package with the same version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#1.2.3",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency is not included in package dependencies', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "bar": "baz/bar#1.2.3",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency version is not valid semantic version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#master",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency in package dependencies has no version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
      });

      describe('with github \'user/repo\' URLs', function() {
         var ea = new EarlyAd(
            { url: 'apbarrero/earlyad', version: '1.2.3' },
            { token: process.env.GITHUB_TOKEN }
         );

         it('should return updated list of dependencies if dependency is listed within package with full URL and a lesser version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "git://github.com/apbarrero/earlyad.git#1.0.0",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.deepEqual(
               ea.checkDepVersion(pack),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "earlyad": "git://github.com/apbarrero/earlyad.git#1.2.3",
                     "bar2": "baz/bar2#1.2.3"
                  }
               }
            );
         });
         it('should return updated list of dependencies if dependency is listed within package with short URL and a lesser version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#1.0.0",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.deepEqual(
               ea.checkDepVersion(pack),
               {
                  "name": "foo",
                  "version": "1.0.0",
                  "dependencies": {
                     "earlyad": "apbarrero/earlyad#1.2.3",
                     "bar2": "baz/bar2#1.2.3"
                  }
               }
            );
         });
         it('should return null if dependency is listed within package with a greater version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#2.0.1",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency is listed within package with the same version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#1.2.3",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency is not included in package dependencies', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "bar": "baz/bar#1.2.3",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency version is not valid semantic version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad#master",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
         });
         it('should return null if dependency in package dependencies has no version', function() {
            var pack = {
               "name": "foo",
               "version": "1.0.0",
               "dependencies": {
                  "earlyad": "apbarrero/earlyad",
                  "bar2": "baz/bar2#1.2.3"
               }
            };

            assert.isNull(ea.checkDepVersion(pack));
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
      var ea = new EarlyAd(
         { url: 'apbarrero/earlyad', version: '1.2.3' },
         { token: process.env.GITHUB_TOKEN }
      );

      it('should return package.json contents for a github repository', function(done) {
         ea.fetchPackageJson('apbarrero/earlyad', function(err, res) {
            assert.isNull(err, JSON.stringify(err));
            assert.equal(res.name, 'earlyad');
            assert.equal(res.description, "Early adopter is a node.js dependency checker and updater");
            done();
         });
      });
   });

   describe('checkDepRepo', function() {
      var ea = new EarlyAd(
         { url: 'apbarrero/earlyad', version: '1.2.3' },
         { token: process.env.GITHUB_TOKEN }
      );

      it('should return the repository package object with dependency list properly updated when one dependency needs to be updated', function(done) {
         var repo = 'git://github.com/apbarrero/earlyad-task.git';

         ea.checkDepRepo(repo, function(err, res) {
            assert.isNull(err, JSON.stringify(err));
            var earlyadTaskPack = res;
            assert.equal(earlyadTaskPack.name, 'earlyad-task');
            assert.propertyVal(earlyadTaskPack.dependencies, "earlyad", "git://github.com/apbarrero/earlyad.git#" + ea.packageInfo.version);
            done();
         })
      });
      it('should return null if repo doesn\'t include the given dependency', function(done) {
         var repo = 'git://github.com/npm/npm.git';

         ea.checkDepRepo(repo, function(err, res) {
            assert.isNull(err, JSON.stringify(err));
            assert.isNull(res, JSON.stringify(err));
            done();
         });
      });
   });

   describe('checkDepRepoList', function() {

      describe('when one repo in the list needs to update the dependency', function() {
         var repolist = [
            "apbarrero/earlyad-task",
            "git://github.com/npm/npm.git"
         ];

         it('should return one package object with the updated dependency list', function(done) {
            ea.checkDepRepoList(repolist, function(err, res) {
               assert.isNull(err, JSON.stringify(err));
               assert.lengthOf(res, 1);
               assert.equal(res[0].repo, 'apbarrero/earlyad-task');
               var earlyadTaskPack = res[0].pack;
               assert.equal(earlyadTaskPack.name, 'earlyad-task');
               assert.propertyVal(earlyadTaskPack.dependencies, "earlyad", "git://github.com/apbarrero/earlyad.git#" + ea.packageInfo.version);
               done();
            });
         });
      });

      describe('when no repo in the list needs to update the dependency', function() {
         var repolist = [
            "npm/nopt",
            "git://github.com/npm/npm.git"
         ];

         it('should return empty array', function(done) {
            ea.checkDepRepoList(repolist, function(err, res) {
               assert.isNull(err, JSON.stringify(err));
               assert.isArray(res);
               assert.lengthOf(res, 0);
               done();
            });
         });
      });
   });
});

