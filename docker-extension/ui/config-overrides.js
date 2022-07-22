const path = require('path');
const uniqid = require('uniqid');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = function override(config, env) {
  const wasmExtensionRegExp = /\.wasm$/;

  config.resolve.extensions.push('.wasm');

  if (!config.plugins) {
    config.plugins = [];
  }

  const buildHash = uniqid();

  config.output = {
    ...config.output,
    filename: `static/js/[name].js?v=${buildHash}`,
    chunkFilename: `static/js/[name].chunk.js?v=${buildHash}`,
  };
  

  const miniCssOptions = {
    filename: "static/css/[name].css?v=[hash]"
  }
  let miniCssAdded = false;

  if( config.plugins.length ) {
      config.plugins.forEach( p => {
          if( p instanceof MiniCssExtractPlugin) {
              delete p;
              p = new MiniCssExtractPlugin( miniCssOptions );
              miniCssAdded = true;
          }              
      })
  }

  config.plugins.forEach( (p,i) => {
    if( p instanceof MiniCssExtractPlugin) {
        //delete p;
        config.plugins.splice(i,1, new MiniCssExtractPlugin( miniCssOptions ));
    }              
})

  config.plugins.push(
    new CopyPlugin(
    { 
      patterns: [{
        from: './node_modules/@eversdk/lib-web/eversdk.wasm',
        to: "assets/eversdk.wasm"
      }],
    })
  );

  config.module.rules.forEach(rule => {
    (rule.oneOf || []).forEach(oneOf => {
      if (oneOf.loader && oneOf.loader.indexOf('file-loader') >= 0) {
        // make file-loader ignore WASM files
        oneOf.exclude.push(wasmExtensionRegExp);
      }
    });
  });

  return config;
};