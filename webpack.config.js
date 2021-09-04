const assert = require('assert')

const configurations = {
  node: require('./webpack.node.config'),
  preview: require('./webpack.preview.config'),
  web: require('./webpack.web.config'),
}

module.exports = (env) => {
  const targets = (
    (env.target && env.target.split(',')) ||
    Object.keys(configurations)
  ).filter(Boolean)

  assert(targets.length > 0, 'No target specified')
  return targets.map((target) => configurations[target](env))
}
