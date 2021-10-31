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
  let firstComment = 0;
  let averageFirstCommentArr = [];
  let averageFirstComment = 0;

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

        let notesRes = request(
          "GET",
          `https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mr.iid}/notes/`,
          {
            headers: {
              "Private-Token": apiToken,
            },
          }
        );
        let notes = JSON.parse(notesRes.getBody());
        notes.filter((note) => note.type === "DiffNote").map((note) => {
          if (firstComment === 0) {
            firstComment = note.created_at;
          }
          if (firstComment > note.created_at) {
            firstComment = note.created_at;
          }
        });

        if (firstComment !== 0) {
          averageFirstCommentArr.push(
            Date.parse(firstComment) - Date.parse(mr.created_at)
          );
        }
        firstComment = 0;

        return parseInt(
          (Date.parse(mr.merged_at) - Date.parse(mr.created_at)) /
            (1000 * 60 * 60 * 24),
          10
        );
      })
      .reduce((p, c) => p + c, 0) / mergeRequests.length;

  averageFirstComment =
    averageFirstCommentArr.reduce((p, c) => p + c, 0) /
    averageFirstCommentArr.length;

  let h, m, s;
  h = Math.floor(averageFirstComment / 1000 / 60 / 60);
  m = Math.floor((averageFirstComment / 1000 / 60 / 60 - h) * 60);
  s = Math.floor(((averageFirstComment / 1000 / 60 / 60 - h) * 60 - m) * 60);
  s < 10 ? (s = `0${s}`) : (s = `${s}`);
  m < 10 ? (m = `0${m}`) : (m = `${m}`);
  h < 10 ? (h = `0${h}`) : (h = `${h}`);

  let entries = Object.entries(topMergeRequestOpenersObj).sort(
    (a, b) => b[1] - a[1]
  );

  let topMergeRequestOpenersOrderedById = entries.map((x) => x[0]);
  let topMergeRequestOpenersOrderedByName = [];
  for (i = 0; i < topMergeRequestOpenersOrderedById.length; i++) {
    topMergeRequestOpenersOrderedByName.push(
      `\n* ${
        topMergeRequestOpenersObjNames[topMergeRequestOpenersOrderedById[i]]
      } - ${
        topMergeRequestOpenersObj[topMergeRequestOpenersOrderedById[i]]
      } merge request(s)`
    );
  }

  console.log(`Average days to be merged: ${averageDays}`);
  console.log(
    `Top merge request openers: ${topMergeRequestOpenersOrderedByName}`
  );
  console.log(`Average time for first comment: ${h}h${m}m${s}s`);
});
