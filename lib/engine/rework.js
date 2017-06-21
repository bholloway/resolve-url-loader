/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

var path    = require('path'),
    convert = require('convert-source-map'),
    rework  = require('rework'),
    visit   = require('rework-visit');

/**
 * Process the given CSS content into reworked CSS content.
 *
 * @param {string} sourceFile The absolute path of the file being processed
 * @param {string} sourceContent CSS content without source-map
 * @param {{outputSourceMap: boolean, transformDeclaration:function, absSourceMap:object,
 *        sourceMapConsumer:object}} params Named parameters
 * @return {{content: string, map: object}} Reworked CSS and optional source-map
 */
function process(sourceFile, sourceContent, params) {

  // embed source-map in css
  var contentWithMap = sourceContent + convert.fromObject(params.absSourceMap).toComment({multiline: true});

  var reworked;
  try {
    reworked = rework(contentWithMap, {source: sourceFile})
      .use(reworkPlugin)
      .toString({
        sourcemap        : params.outputSourceMap,
        sourcemapAsObject: params.outputSourceMap
      });
  }
  catch (exception) {
    return exception;
  }

  // complete with source-map
  if (params.outputSourceMap) {
    return {
      content: reworked.code,
      map    : reworked.map
    };
  }
  // complete without source-map
  else {
    return {
      content: reworked,
      map    : null
    };
  }


  /**
   * Plugin for css rework that follows SASS transpilation.
   *
   * @param {object} stylesheet AST for the CSS output from SASS
   */
  function reworkPlugin(stylesheet) {

    // visit each node (selector) in the stylesheet recursively using the official utility method
    //  each node may have multiple declarations
    visit(stylesheet, function visitor(declarations) {
      if (declarations) {
        declarations.forEach(eachDeclaration);
      }
    });

    /**
     * Process a declaration from the syntax tree.
     * @param declaration
     */
    function eachDeclaration(declaration) {
      var isValid = declaration.value && (declaration.value.indexOf('url') >= 0);
      if (isValid) {

        // reverse the original source-map to find the original source file before transpilation
        var startPosApparent = declaration.position.start,
            startPosOriginal = params.sourceMapConsumer &&
              params.sourceMapConsumer.originalPositionFor(startPosApparent);

        // we require a valid directory for the specified file
        var directory = startPosOriginal && startPosOriginal.source && path.dirname(startPosOriginal.source);
        if (directory) {
          declaration.value = params.transformDeclaration(declaration.value, directory);
        }
        // source-map present but invalid entry
        else if (params.sourceMapConsumer) {
          throw new Error('source-map information is not available at url() declaration');
        }
      }
    }
  }
}

module.exports = process;
