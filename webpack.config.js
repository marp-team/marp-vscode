const assert = require('assert')

const viewsConf = require('./webpack.views.config')

const configurations = {
  node: [viewsConf, require('./webpack.node.config')],
  preview: [require('./webpack.preview.config')],
  web: [viewsConf, require('./webpack.web.config')],
}

module.exports = (env) => {
  const targets = (
    (env.target && env.target.split(',')) ||
    Object.keys(configurations)
  ).filter(Boolean)

  assert(targets.length > 0, 'No target specified')

  return targets
    .flatMap((target) => configurations[target])
    .map((target) => target(env))
}
