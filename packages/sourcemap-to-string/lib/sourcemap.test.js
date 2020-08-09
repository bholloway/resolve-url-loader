/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

const {basename, normalize, join} = require('path');
const {readFileSync} = require('fs');

const tape = require('blue-tape');
const compose = require('compose-function');
const outdent = require('outdent');

const {mapList} = require('./array');
const {
  mappingsToAbsolute, absoluteToMappings, absoluteToObj, objToAbsolute, tuplesWithSubstring, objToString
} = require('./sourcemap');

const rebase = (base) => (filename) =>
  compose(normalize, join)(base, filename);

const getFileRaw = (filename) =>
  readFileSync(require.resolve(filename), 'utf8');

const getFileJson = compose(JSON.parse, getFileRaw);

const getSourcesRaw = compose(
  mapList(getFileRaw),
  mapList(rebase('../test/src')),
  ({sources}) => sources,
  getFileJson
);

tape(
  basename(require.resolve('./sourcemap')),
  ({name, test, end: end1, equal, deepEqual}) => {
    const {absoluteDev, absoluteProd, objDev, objProd} = require('../test/expectations.json');

    test(`${name} / mappingsToAbsolute()`, ({ end: end2 }) => {
      const {mappings: mappingsDev} = getFileJson('../test/development.css.map');
      deepEqual(
        mappingsToAbsolute(mappingsDev),
        absoluteDev,
        'development should match'
      );

      const {mappings: mappingsProd} = getFileJson('../test/production.css.map');
      deepEqual(
        mappingsToAbsolute(mappingsProd),
        absoluteProd,
        'production should match'
      );

      end2();
    });

    test(`${name} / absoluteToMappings()`, ({ end: end2 }) => {
      const {mappings: mappingsDev} = getFileJson('../test/development.css.map');
      deepEqual(
        absoluteToMappings(absoluteDev),
        mappingsDev,
        'development should match'
      );

      const {mappings: mappingsProd} = getFileJson('../test/production.css.map');
      deepEqual(
        absoluteToMappings(absoluteProd),
        mappingsProd,
        'production should match'
      );

      end2();
    });

    test(`${name} / absoluteToObj()`, ({ end: end2 }) => {
      deepEqual(
        absoluteToObj(absoluteDev),
        objDev,
        'development should match'
      );

      deepEqual(
        absoluteToObj(absoluteProd),
        objProd,
        'production should match'
      );

      end2();
    });

    test(`${name} / objToAbsolute()`, ({ end: end2 }) => {
      deepEqual(
        objToAbsolute(objDev),
        absoluteDev,
        'development should match'
      );

      deepEqual(
        objToAbsolute(objProd),
        absoluteProd,
        'production should match'
      );

      end2();
    });

    test(`${name} / tuplesWithSubstring()`, ({ end: end2 }) => {
      deepEqual(
        tuplesWithSubstring(
          [
            [1,  1], [1,  4], [1, 5],
            [2,  6], [2,  7],
            [3, 12], [3, 13],
          ],
          outdent`
          The quick
          brown fox
          jumped over the
          lazy dog
          `
        ),
        [
          [1,  1, 'The'             ],
          [1,  4, ' '               ],
          [1,  5, `quick\nbrown`    ],
          [2,  6, ' '               ],
          [2,  7, `fox\njumped over`],
          [3, 12, ' '               ],
          [3, 13, `the\nlazy dog`   ]
        ],
        'should match'
      );

      end2();
    });

    test(`${name} / objToString()`, ({ end: end2 }) => {
      const contentDev = getFileRaw('../test/development.css');
      const {sources: sourcesDev} = getFileJson('../test/development.css.map');
      const sourcesContentDev = getSourcesRaw('../test/development.css.map');
      deepEqual(
        objToString(80, objDev, contentDev, sourcesDev, sourcesContentDev),
        outdent`
        feature/index.scss                                                             
        -------------------------------------------------------------------------------
        1:01 .some-class-name {⏎                1:01 .some-class-name {⏎               
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        2:03 ░░single-quoted: url('../images/im 2:03 ░░single-quoted: url("./images/img
             g.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░      .jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        2:42 ░░░░░░░;⏎                          2:41 ░░░░░░;⏎                          
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        3:03 ░░double-quoted: url("../images/im 3:03 ░░double-quoted: url("./images/img
             g.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░      .jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        3:42 ░░░░░░░;⏎                          3:41 ░░░░░░;⏎                          
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        4:03 ░░unquoted: url(../images/img.jpg) 4:03 ░░unquoted: url(./images/img.jpg)░
        4:35 ;⏎                                 4:34 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░;
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                 
             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        5:03 ░░query: url(../images/img.jpg?que 5:03 ░░query: url(./images/img.jpg?quer
             ry)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      y)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        5:38 ░░░;⏎                              5:37 ░░;⏎                              
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        6:03 ░░hash: url(../images/img.jpg#hash 6:03 ░░hash: url(./images/img.jpg#hash)
             )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        6:36 ░;⏎                                6:35 ; }⏎                              
             }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                       
        index.scss                                                                     
        -------------------------------------------------------------------------------
        2:01 .another-class-name {⏎             8:01 .another-class-name {⏎            
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        3:03 ░░display: block░░░░░░░░░░░░░░░░░░ 9:03 ░░display: block░░░░░░░░░░░░░░░░░░
        3:17 ░░░░░░░░░░░░░░░░;⏎                 9:17 ░░░░░░░░░░░░░░░░; }⏎              
             }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                 
             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ⏎                                 
             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      /*# sourceMappingURL=development.c
             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ss.map*/░░░░░░░░░░░░░░░░░░░░░░░░░░
        `,
        'development should match'
      );

      const contentProd = getFileRaw('../test/production.css');
      const {sources: sourcesProd} = getFileJson('../test/production.css.map');
      const sourcesContentProd = getSourcesRaw('../test/production.css.map');
      deepEqual(
        objToString(80, objProd, contentProd, sourcesProd, sourcesContentProd),
        outdent`
        feature/index.scss                                                              
        --------------------------------------------------------------------------------
        1:01 .some-class-name {⏎                1:001 .some-class-name{░░░░░░░░░░░░░░░░░
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        2:03 ░░single-quoted: url('../images/im 1:018 ░░░░░░░░░░░░░░░░░single-quoted:url
             g.jpg')░░░░░░░░░░░░░░░░░░░░░░░░░░░       (images/img.jpg)░░░░░░░░░░░░░░░░░░
        2:42 ░░░░░░░;⏎                          1:051 ░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        3:03 ░░double-quoted: url("../images/im 1:052 ░░░░░░░░░░░░░░░░░double-quoted:url
             g.jpg")░░░░░░░░░░░░░░░░░░░░░░░░░░░       (images/img.jpg)░░░░░░░░░░░░░░░░░░
        3:42 ░░░░░░░;⏎                          1:085 ░░░░░░░░░░░░░░░░;░░░░░░░░░░░░░░░░░
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        4:03 ░░unquoted: url(../images/img.jpg) 1:086 ░░░░░░░░░░░░░░░░░unquoted:url(imag
             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       es/img.jpg)░░░░░░░░░░░░░░░░░░░░░░░
        4:35 ;⏎                                 1:114 ░░░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        5:03 ░░query: url(../images/img.jpg?que 1:115 ░░░░░░░░░░░░query:url(images/img.j
             ry)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       pg?query)░░░░░░░░░░░░░░░░░░░░░░░░░
        5:38 ░░░;⏎                              1:146 ░░░░░░░░░;░░░░░░░░░░░░░░░░░░░░░░░░
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        6:03 ░░hash: url(../images/img.jpg#hash 1:147 ░░░░░░░░░░hash:url(images/img.jpg#
             )░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       hash)░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        6:36 ░;⏎                                1:176 ░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░
             }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                                                                                        
        index.scss                                                                      
        --------------------------------------------------------------------------------
        2:01 .another-class-name {⏎             1:177 ░░░░░░.another-class-name{░░░░░░░░
               ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        3:03 ░░display: block░░░░░░░░░░░░░░░░░░ 1:197 ░░░░░░░░░░░░░░░░░░░░░░░░░░display:
             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       block░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        3:17 ░░░░░░░░░░░░░░░░;⏎                 1:210 ░░░░░}░░░░░░░░░░░░░░░░░░░░░░░░░░░░
             }░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        `,
        'production should match'
      );

      end2();
    });

    end1();
  }
);
