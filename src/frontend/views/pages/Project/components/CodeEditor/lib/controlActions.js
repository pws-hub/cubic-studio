

export default ( monaco, editor, component ) => {

  /*
   * Explanation:
   * Press F1 => the action will appear and run if it is enabled
   * Press Ctrl-F10 => the action will run if it is enabled
   * Press Chord Ctrl-K, Ctrl-M => the action will run if it is enabled
   */

  editor.addAction({
    // An unique identifier of the contributed action.
    id: 'save',

    // A label of the action that will be presented to the user.
    label: 'Save with key control',

    // An optional array of keybindings for the action.
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      /*
       * Monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10,
       * chord
       * monaco.KeyMod.chord(
       *   monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
       *   monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM
       * )
       */
    ],

    // A precondition for this action.
    precondition: null,
    // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
    keybindingContext: null,

    /*
     * ContextMenuGroupId: 'navigation',
     * contextMenuOrder: 1.5,
     */

    // Save active model
    run: _editor => component.onSave()
  })
}
