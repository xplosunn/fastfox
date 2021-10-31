#! /usr/bin/env node

let inquirer = require("inquirer");
let request = require("sync-request");
const { ObjectFlags } = require("typescript");

let questions = [
  {
    type: "input",
    name: "apiToken",
    message: "What's your GitLab api token?",
  },
  {
    type: "input",
    name: "projectId",
    message: "What's your GitLab project id?",
  },
];

inquirer.prompt(questions).then((answers) => {
  let apiToken = answers["apiToken"];
  let projectId = answers["projectId"];

  let res = request(
    "GET",
    `https://gitlab.com/api/v4/projects/${projectId}/merge_requests?state=merged`,
    {
      headers: {
        "Private-Token": apiToken,
      },
    }
  );

  let mergeRequests = JSON.parse(res.getBody());
  let topMergeRequestOpenersObj = {};
  let topMergeRequestOpenersObjNames = {};

  let averageDays =
    mergeRequests
      .map((mr) => {
        if (mr.author.id in topMergeRequestOpenersObj) {
          topMergeRequestOpenersObj[mr.author.id] =
            topMergeRequestOpenersObj[mr.author.id] + 1;
        } else {
          topMergeRequestOpenersObj[mr.author.id] = 1;
        }
        topMergeRequestOpenersObjNames[mr.author.id] = mr.author.name;
        console.log(mr);
        return parseInt(
          (Date.parse(mr.merged_at) - Date.parse(mr.created_at)) /
            (1000 * 60 * 60 * 24),
          10
        );
      })
      .reduce((p, c) => p + c, 0) / mergeRequests.length;

  let entries = Object.entries(topMergeRequestOpenersObj).sort(
    (a, b) => b[1] - a[1]
  );
  let topMergeRequestOpenersOrderedById = entries.map(x => x[0]);
  let topMergeRequestOpenersOrderedByName = [];
  for (i = 0; i < topMergeRequestOpenersOrderedById.length; i++) {
    topMergeRequestOpenersOrderedByName.push(`\n* ${topMergeRequestOpenersObjNames[topMergeRequestOpenersOrderedById[i]]} - ${topMergeRequestOpenersObj[topMergeRequestOpenersOrderedById[i]]} merge request(s)`);
  }

  console.log(`Average days: ${averageDays}`);
  console.log(
    `Top merge request openers: ${topMergeRequestOpenersOrderedByName}`
  );
});
