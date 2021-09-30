#! /usr/bin/env node

var inquirer = require('inquirer');
var request = require('sync-request');

var questions = [
  {
    type: 'input',
    name: 'apiToken',
    message: "What's your GitLab api token?"
  },
  {
      type: 'input',
      name: 'projectId',
      message: "What's your GitLab project id?"
  }
]

inquirer.prompt(questions).then(answers => {
  var apiToken = answers['apiToken'];
  var projectId = answers['projectId'];

  var res = request('GET', `https://gitlab.com/api/v4/projects/${projectId}/merge_requests?state=merged`, {
    headers: {
      'Private-Token': apiToken,
    },
  });

  var mergeRequests = JSON.parse(res.getBody());
  var averageDays = mergeRequests.map((mr) => {
    return parseInt((Date.parse(mr.merged_at) - Date.parse(mr.created_at)) / (1000 * 60 * 60 * 24), 10);
  }).reduce( ( p, c ) => p + c, 0 ) / mergeRequests.length;
  console.log(`Average days: ${averageDays}`)
})