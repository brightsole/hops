# items

[![Auto merge basic check](https://github.com/brightsole/solosis-sst/actions/workflows/test.yml/badge.svg)](https://github.com/brightsole/solosis-sst/actions/workflows/test.yml)

## INFO

This is a generic item CRUD/GraphQL service. It creates, updates, deletes, and allows for direct gets as well as supporting an _ok_ query language.
<details>
<summary><strong>Before running the service</strong></summary>

- log into the aws account
- create a new user, assign permissions directly to it, the only permission being: administrator access
- copy the KEY ID and the SECRET ACCESS KEY
- add them to the `~/.aws/credentials` like this:

	```
	[your-application]
	aws_access_key_id = KEY_ID
	aws_secret_access_key = SECRET_KEY
	```

- add configuration to your `~/.aws/config` as well:

	```
	[profile your-application]
	output=json
	region=ap-southeast-2
	```

</details>

### RUNNING THE SERVICE
run the service locally with `npm start`
deploy the service to sst by configuring the github action. you'll need to set up OIDC and aws creds. I'm a repo not a library; look it up.

## TODOS
1. expand the query language to allow for better lookin' up stuff (we only allow looking up all items belonging to a user)
1. controller error wrapper to human-print dynamoose goo
1. extract routes file and test it to the level of the graphql resolvers
1. post some pretty charts of how fast everything is
