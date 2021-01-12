module.exports = api => {
  api.cache(false)
  return {
    presets: ["@babel/preset-env"],
    plugins: [
                ["@babel/plugin-proposal-object-rest-spread", { "useBuiltIns": true }],
                ["@babel/plugin-transform-runtime",
                  {
                    "regenerator": true
                  }
                ]
              ]
  }
}
