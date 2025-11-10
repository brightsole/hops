# hops

[![Auto merge basic check](https://github.com/brightsole/hops/actions/workflows/test.yml/badge.svg)](https://github.com/brightsole/hops/actions/workflows/test.yml)
[![Dependabot Updates](https://github.com/brightsole/hops/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/brightsole/hops/actions/workflows/dependabot/dependabot-updates)
[![Deploy to Production](https://github.com/brightsole/hops/actions/workflows/deploy.yml/badge.svg)](https://github.com/brightsole/hops/actions/workflows/deploy.yml)

[development](https://dcdo87f94j.execute-api.ap-southeast-2.amazonaws.com/graphql)

[production](https://ydze25r914.execute-api.ap-southeast-2.amazonaws.com/graphql)

### Notable information
- links are a duplicated information pure data record type with hops (user specific)


<pre>
                      ┌────────────────────────────────────────────────────────────────┐
                      │    <a href="https://github.com/brightsole/jumpingbeen.com">jumpingbeen.com</a>                                             │
                      └─────────────┬─▲────────────────────────────────────────────────┘
                                    │ │
                      ┌───────────────────────────────────────────────────────────┐
                      │    <a href="https://github.com/brightsole/gateway">Federation gateway</a>                                     |
                      │───────────────────────────────────────────────────────────┼───┐
    ┌────────────────►│   DMZ                                                     ◄──┐│
  ┌──────────────────►└───────────────────────────────────────────────────────────┘  ││
  │ │                   ▲                                                      ▲     ││
  │ │                   │                                                      │     ││
  │ │                 ┌─┴────────────────────────────────────────────────────┐ │  ┌──┴▼──────────────────┐
  │ │                 │    <a href="https://github.com/brightsole/solves">Solves service</a>                                    │ │  │ Users service (soon) │
  │ │                 └┬───────────▲───┬─▲────────┬▲────────┬▲───────────────┘ │  └──────────────────────┘
  │ │                  │           │   │ │        ││        ││                 │
  │ │                  │Attempts   │ ┌─▼─┴────┐   ││        ││                 │
  │ │                  │ are       │ ┌────────┐   ││        ││                 │
  │ │                  │memory only│ │  DDB   │   ││        ││                 │
  │ │                  └───────────┘ │ Solves │   ││        ││                 │
  │ │   you're here                  └────────┘   ││        ││                 │
  │┌┴───*─────────────────────────────────────────▼┴──┐   ┌─▼┴─────────────────┴─────────────────────────┐
  ││    <a href="https://github.com/brightsole/hops">Hops service</a>                                  ├───►<a href="https://github.com/brightsole/games">    Games service</a>                             │
  │└──────▲┬─────────┬─▲─────────┬────────────┬─▲─────◄───┴──┬─▲─────────────────────────────────────────┘
  │       ││         │ │         │            │ │            │ │
  │       ││       ┌─▼─┴───┐     │User      ┌─▼─┴───┐      ┌─▼─┴───┐
  │       ││       ┌───────┐     │Goo       ┌───────┐      ┌───────┐
  │       ││       │  DDB  │     │          │  DDB  │      │  DDB  │
  │       ││       │ Links ├───┐ └─────────►│ Hops  │      │ Games │
  │       ││       └───────┘   └───────────►└───────┘      └───────┘
 ┌┴───────┴▼──────────────────────────────────────────┐
 │    <a href="https://github.com/brightsole/words">Words service</a>                                   │
 └──────┬───────────────────────▲─────┬─▲─────────────┘
        │                       │     │ │
        ├─────►Dictionary api───┤   ┌─▼─┴───┐
        │                       │   ┌───────┐
        ├─────►RiTa package─────┤   │  DDB  │
        │                       │   │ Words │
        └─────►Datamuse api─────┘   └───────┘
</pre>

## TODO
1. lock it down
