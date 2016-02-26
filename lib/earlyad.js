var semver = require('semver');
var GitHubApi = require('github');
var async = require('async');
var moment = require('moment');

var github = new GitHubApi({
   // required
   version: "3.0.0",
   // optional
   protocol: "https",
   host: "api.github.com",
   pathPrefix: "",
   timeout: 5000,
   headers: {
      "user-agent": "auth0-early-adopter"
   }
});

github.authenticate({
   type: "oauth",
   token: process.env.GITHUB_TOKEN
});

// Checks if `newVersion` is actually greater than `curVersion`
//
// Both input parameters are expected to be text strings with
// semantic version contents according to http://semver.org,
// i.e. `X.Y.Z`
// Will return false if any the parameter values are non-compliant
function isNewerVersion(newVersion, curVersion) {
   return semver.valid(newVersion)
       && semver.valid(curVersion)
       && semver.gt(newVersion, curVersion);
}

function normalize(url) {
   // 'user/repo#x.y.z' format, with optional version
   if (url.substring(0, 6) == "git://") {
      return url;
   }
   else {
      var pattern = /(^[^\/]+\/[^\/#]+)(#.*)?$/;
      var match = pattern.exec(url);
      if (match) {
         var nurl = "git://github.com/" + match[1] + ".git";
         if (match[2]) nurl += match[2];
         return nurl;
      }
   }
}

// Looks for `dependency.url` to be included in `package.dependencies`
// and checks for `version` to be newer.
//
// Returns the updated `package` object if so and null otherwise
//
// - `pack`: contents of a `package.json`
// - `dependency`: {
//    url: "git URL, e.g. 'git://github.com/user/repo' or 'user/repo' for github repos",
//    version: 'X.Y.Z'
// }
function checkDepVersion(pack, dependency) {
   var depUrl = normalize(dependency.url);
   var urlRegex = new RegExp(depUrl + "#(.*)");
   for (dep in pack.dependencies) {
      var match = urlRegex.exec(normalize(pack.dependencies[dep]));
      if (match) {
         var currentVersion = match[1];
         if (isNewerVersion(dependency.version, currentVersion)) {
            var pack = JSON.parse(JSON.stringify(pack));
            pack.dependencies[dep] = pack.dependencies[dep].replace(/#.*$/, "#" + dependency.version);
            return pack;
         }
      }
   }
   return null;
}

// Extract user and repo name form a github URL
function extractUserRepo(url) {
   var match = /^([^\/]+)\/([^\/\.]+)$/.exec(url);
   if (match) {
      return { user: match[1], repo: match[2] };
   }
   else {
      match = /^git:\/\/github.com\/(.*\/.*).git/.exec(url);
      if (match) {
         return extractUserRepo(match[1]);
      }
   }
   return null;
}

// Return the contents of `package.json` for a github repo at `repoUrl`
// `repoUrl` may have a full git or abbreviated URL
function fetchPackageJson(repoUrl, done) {
   var repo = extractUserRepo(repoUrl);
   github.repos.getContent({
      user: repo.user,
      repo: repo.repo,
      path: "package.json"
   }, function(err, res) {
      if (err) done(err);
      else {
         done(null, JSON.parse(new Buffer(res.content, 'base64').toString('ascii')));
      }
   });
};

// Check a `repo` to see if `dependency` is included in its
// dependency list with version lesser than `dependency.version`
//
// Return the corresponding package.json updated value for
// `dependencies` property
function checkDepRepo(repo, dependency, done) {
   fetchPackageJson(repo, function(err, res) {
      if (err) done(err);
      else {
         done(null, checkDepVersion(res, dependency));
      }
   });
}

// Check a list of repositories to see if they have `dependency`
// in their dependency list and a version lesser than `dependency.version`
//
// Return a list of repository urls mapped to the
// corresponding package.json updated `dependencies` property
function checkDepRepoList(repos, dependency, done) {
   async.map(repos, function(repo, callback) {
      checkDepRepo(repo, dependency, function(err, res) {
         if (err) callback(err);
         else {
            callback(null, { "repo": repo, "pack": res });
         }
      });
   }
   , function(err, res) {
      if (err) done(err);
      else
         done(null, res.filter(function(item) { return item.pack !== null; }));
   });
}

// Creates a pull request in the given github `data.repoUrl` with a single
// commit updating contents of `package.json` with `data.pack`.
// Pull request title will be `data.title`
function createPullRequest(data, done) {
   var repo = extractUserRepo(data.repoUrl);
   var packageJsonSha, headCommitSha;
   var branch = 'earlyad-' + moment().valueOf();

   var getMasterBranchTipSha = function(callback) {
      github.repos.getBranch({
         user: repo.user,
         repo: repo.repo,
         branch: "master"
      }, function(err, res) {
         if (err) callback(err);
         else {
            headCommitSha = res.commit.sha;
            callback(null, res);
         }
      });
   };

   var getPackageJsonSha = function(callback) {
      github.repos.getContent({
         user: repo.user,
         repo: repo.repo,
         path: "package.json"
      }, function(err, res) {
         if (err) callback(err);
         else {
            packageJsonSha = res.sha;
            callback(null, res);
         }
      });
   };

   var createNewBranch = function(callback) {
      github.gitdata.createReference({
         user: repo.user,
         repo: repo.repo,
         ref: "refs/heads/" + branch,
         sha: headCommitSha
      }, function(err, res) {
         if (err) callback(err);
         else {
            callback(null, res);
         }
      });
   };

   var createCommitWithUpdatedPackageJson = function(callback) {
      github.repos.updateFile({
         user: repo.user,
         repo: repo.repo,
         path: "package.json",
         sha: packageJsonSha,
         content: new Buffer(JSON.stringify(data.pack, null, 2)).toString('base64'),
         message: data.title,
         branch: branch
      }, function(err, res) {
         if (err) callback(err);
         else {
            callback(null, res);
         }
      });
   };

   var submitPullRequest = function(callback) {
      github.pullRequests.create({
         user: repo.user,
         repo: repo.repo,
         title: data.title,
         base: 'master',
         head: branch
      }, function(err, res) {
         if (err) callback(err);
         else {
            console.log("Created pull request " + res.url);
            callback(null, res);
         }
      });
   };

   async.series([
      getMasterBranchTipSha,
      getPackageJsonSha,
      createNewBranch,
      createCommitWithUpdatedPackageJson,
      submitPullRequest
   ], function(err, res) {
      if (err) done(err);
      else {
         done(null, res);
      }
   });
}

module.exports.isNewerVersion = isNewerVersion;
module.exports.checkDepVersion = checkDepVersion;
module.exports.extractUserRepo = extractUserRepo;
module.exports.fetchPackageJson = fetchPackageJson;
module.exports.checkDepRepo = checkDepRepo;
module.exports.checkDepRepoList = checkDepRepoList;



