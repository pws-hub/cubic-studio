
export default monaco => {

  monaco.editor.defineTheme( 'retouch', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'ececec' },
      { token: 'invalid', foreground: 'ff3333' },
      { token: 'invalid.illegal.character-not-allowed-here.marko', foreground: 'ff3333' },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'variable', foreground: 'ececec' },
      { token: 'variable.parameter', foreground: 'ececec' },
      { token: 'variable.predefined', foreground: 'ececec' },
      { token: 'variable.language.this', foreground: 'ffb7a1' },
      { token: 'variable.other.constant', foreground: 'a4e1ff' },
      { token: 'constant', foreground: 'e2fabd' },
      { token: 'constant.language.null', foreground: '4dbf99' },
      { token: 'constant.language.boolean', foreground: '4dbf99' },
      { token: 'constant.language.nan', foreground: 'e2fabd' },
      { token: 'constant.language.infinity', foreground: 'e2fabd' },
      { token: 'comment', foreground: '6b6b6b' },
      { token: 'number', foreground: 'e2fabd' },
      { token: 'number.hex', foreground: 'e2fabd' },
      { token: 'regexp', foreground: '4dbf99' },
      { token: 'annotation', foreground: 'a4e1ff' },
      { token: 'type', foreground: 'a4e1ff' },
      { token: 'delimiter', foreground: 'ececec' },
      { token: 'delimiter.html', foreground: 'ececec' },
      { token: 'delimiter.xml', foreground: 'ececec' },
      { token: 'tag', foreground: 'e2fabd' },
      { token: 'tag.id.jade', foreground: 'e2fabd' },
      { token: 'tag.class.jade', foreground: 'e2fabd' },
      { token: 'meta.scss', foreground: 'e2fabd' },

      { token: 'meta.definition.variable', foreground: 'ececec' },
      { token: 'meta.marko-attribute', foreground: 'e2fabd' },
      { token: 'meta.marko-concise-content', foreground: 'e2fabd' },
      { token: 'metatag', foreground: 'e2fabd' },

      { token: 'punctuation.definition.tag.begin.marko', foreground: 'a3a3a3' },
      { token: 'punctuation.definition.tag.end.marko', foreground: 'a3a3a3' },
      { token: 'punctuation.definition.template-expression.begin.js', foreground: 'fff00f' },
      /*
       * { token: 'punctuation.section.scope.begin.marko', foreground: 'e2fabd' },
       * { token: 'punctuation.section.scope.end.marko', foreground: 'e2fabd' },
       */
      { token: 'punctuation.definition.marko-tag.html', foreground: '4dbf99' },
      { token: 'punctuation.seperator.namespace', foreground: 'ececec' },
      { token: 'punctuation.destructuring', foreground: 'ececec' },

      /*
       * { token: 'metatag.content.html', foreground: '86b300' },
       * 'entity.other.attribute-name.class.css',
       * 'entity.other.attribute-name.class.mixin.css',
       * 'entity.other.attribute-name.id.css',
       * 'entity.other.attribute-name.parent-selector.css',
       * 'entity.other.attribute-name.pseudo-class.css',
       * 'entity.other.attribute-name.pseudo-element.css',
       * 'source.css.less entity.other.attribute-name.id',
       * 'entity.other.attribute-name.attribute.scss',
       * 'entity.other.attribute-name.scss'
       */
      { token: 'entity.name', foreground: '4dbf99' },
      { token: 'entity.name.function', foreground: 'e2fabd' },
      { token: 'entity.other.inherited-class', foreground: '4dbf99' },
      { token: 'entity.name.tag.marko', foreground: '84a1ff' },
      { token: 'entity.other.attribute-name', foreground: 'a4e1ff' },
      { token: 'entity.other.attribute-name.class', foreground: 'e2fabd' },

      { token: 'support.function', foreground: '4dbf99' },
      { token: 'support.class', foreground: '4dbf99' },
      { token: 'support.type.attribute-name.marko', foreground: 'e2fabd' },
      { token: 'support.function.attribute-name.marko', foreground: 'e2fabd' },

      { token: 'metatag.html', foreground: 'e2fabd' },
      { token: 'metatag.xml', foreground: 'e2fabd' },
      { token: 'key', foreground: 'a4e1ff' },
      { token: 'string', foreground: '87b49e' },
      { token: 'string.key.json', foreground: 'a4e1ff' },
      /*
       * { token: 'string.value.json', foreground: 'e2fabd' },
       * { token: 'string.yaml', foreground: 'e2fabd' },
       */
      { token: 'attribute.name', foreground: '000000' },
      { token: 'attribute.value', foreground: '0451A5' },
      { token: 'attribute.value.number', foreground: 'abb0b6' },
      { token: 'attribute.value.unit', foreground: '86b300' },
      { token: 'attribute.value.html', foreground: '86b300' },
      { token: 'attribute.value.xml', foreground: '86b300' },

      { token: 'storage.type', foreground: '84a1ff' },
      { token: 'storage.modifier', foreground: '4dbf99' },
      { token: 'storage.type.interface', foreground: '4dbf99' },

      { token: 'keyword.control', foreground: 'ce88bc' },
      { token: 'keyword.operator.assignment', foreground: 'ffffff' },
      { token: 'keyword.operator.type.anotation', foreground: 'fff00f' },
      { token: 'keyword.operator.spread', foreground: 'ececec' },
      { token: 'keyword.json', foreground: 'ce88bc' },
      { token: 'keyword.control.static.marko', foreground: 'fff00f' },
      { token: 'keyword.flow', foreground: 'ce88bc' },
      { token: 'keyword.flow.scss', foreground: 'ce88bc' },
      { token: 'keyword.control.static.marko', foreground: 'e2fabd' },
      { token: 'keyword.control.scriptlet.marko', foreground: 'e2fabd' },

      { token: 'operator', foreground: 'ececec' },
      { token: 'operator.scss', foreground: '666666' }
    ],
    colors: {
      // 'editor.background': '#000000'
    }
  })

  monaco.editor.setTheme('retouch')
}