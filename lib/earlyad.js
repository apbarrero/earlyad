var semver = require('semver');
var GitHubApi = require('github');
var async = require('async');


// `packageInfo`:
// {
//    url: "github URL, e.g. 'git://github.com/user/repo' or just 'user/repo',
//    version: 'X.Y.Z'
// }
function EarlyAd(packageInfo, options) {
   this.packageInfo = packageInfo;
   this.options = options;

   this.github = new GitHubApi({
      // required
      version: "3.0.0",
      // optional
      protocol: "https",
      host: "api.github.com",
      pathPrefix: "",
      timeout: 5000,
      headers: {
         "user-agent": "earlyad"
      }
   });

   if (options.token) {
      this.github.authenticate({
         type: "oauth",
         token: options.token
      });
   }
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

// Extract user and repo name from a github URL
EarlyAd.prototype.extractUserRepo = function (url) {
   var match = /^([^\/]+)\/([^\/\.]+)$/.exec(url);
   if (match) {
      return { user: match[1], repo: match[2] };
   }
   else {
      match = /^git:\/\/github.com\/(.*\/.*).git/.exec(url);
      if (match) {
         return this.extractUserRepo(match[1]);
      }
   }
   return null;
}

// Checks if `curVersion` is older than current, i.e. this.packageInfo.version
//
// Input parameter is expected to be a text strings with
// semantic version contents according to http://semver.org,
// i.e. `X.Y.Z`
// Will return false if the parameter value is non-compliant
EarlyAd.prototype.isOldVersion = function (curVersion) {
   var newVersion = this.packageInfo.version;

   return semver.valid(newVersion)
       && semver.valid(curVersion)
       && semver.gt(newVersion, curVersion);
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
EarlyAd.prototype.checkDepVersion = function (pack) {
   var depUrl = normalize(this.packageInfo.url);
   var urlRegex = new RegExp(depUrl + "#(.*)");
   for (dep in pack.dependencies) {
      var match = urlRegex.exec(normalize(pack.dependencies[dep]));
      if (match) {
         var currentVersion = match[1];
         if (this.isOldVersion(currentVersion)) {
            var pack = JSON.parse(JSON.stringify(pack));
            pack.dependencies[dep] = pack.dependencies[dep].replace(/#.*$/, "#" + this.packageInfo.version);
            return pack;
         }
      }
   }
   return null;
}

// Return the contents of `package.json` for a github repo at `repoUrl`
// `repoUrl` may have a full git or abbreviated URL
EarlyAd.prototype.fetchPackageJson = function (repoUrl, done) {
   var repo = this.extractUserRepo(repoUrl);
   this.github.repos.getContent({
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

// Check a `repo` to see if `this.packageInfo.url` is included in its
// dependency list with version lesser than `this.packageInfo.version`
//
// Return the corresponding package.json updated value
EarlyAd.prototype.checkDepRepo = function (repo, done) {
   var self = this;
   self.fetchPackageJson(repo, function(err, res) {
      if (err) done(err);
      else {
         done(null, self.checkDepVersion(res));
      }
   });
}

// Check a list of repositories to see if they have `this.packageInfo.url`
// in their dependency list and a version lesser than `this.packageInfo.version`
//
// Return a list of repository urls mapped to the
// corresponding package.json updated `dependencies` property
EarlyAd.prototype.checkDepRepoList = function (repos, done) {
   var self = this;
   async.map(repos, function(repo, callback) {
      self.checkDepRepo(repo, function(err, res) {
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
EarlyAd.prototype.createPullRequest = function (data, done) {
   var self = this;
   var repo = extractUserRepo(data.repoUrl);
   var packageJsonSha, headCommitSha;
   var branch = 'earlyad-' + new Date().valueOf();

   var getMasterBranchTipSha = function(callback) {
      self.github.repos.getBranch({
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
      self.github.repos.getContent({
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
      self.github.gitdata.createReference({
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
      self.github.repos.updateFile({
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
      self.github.pullRequests.create({
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

module.exports = EarlyAd;

