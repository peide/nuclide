'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {PythonCompletion} from '../../nuclide-python-base/lib/PythonService';

import {trackTiming} from '../../nuclide-analytics';
import {TYPES} from './constants';
import {getCompletions} from './jedi-client-helpers';
import {getAutocompleteArguments} from './config';

const VALID_EMPTY_SUFFIX = /(\.|\()$/;
const TRIGGER_COMPLETION_REGEX = /([\. ]|[a-zA-Z_][a-zA-Z0-9_]*)$/;

function getText(completion: PythonCompletion): string {
  // Generate a snippet if completion is a function. Otherwise just return the
  // completion text.
  if (completion.params) {
    const placeholders = completion.params.map((param, index) =>
      `\${${index + 1}:${param}}`
    );
    return `${completion.text}(${placeholders.join(', ')})`;
  }
  return completion.text;
}

export default class AutocompleteHelpers {

  @trackTiming('nuclide-python:getAutocompleteSuggestions')
  static async getAutocompleteSuggestions(
    request: atom$AutocompleteRequest,
  ): Promise<Array<atom$AutocompleteSuggestion>> {
    const {editor, activatedManually, prefix} = request;

    if (!TRIGGER_COMPLETION_REGEX.test(prefix)) {
      return [];
    }

    if (!activatedManually && prefix === '') {
      const wordPrefix = editor.getLastCursor().getCurrentWordPrefix();
      if (!VALID_EMPTY_SUFFIX.test(wordPrefix)) {
        return [];
      }
    }

    let result;
    try {
      result = await getCompletions(editor);
    } catch (e) {
      return [];
    }
    if (result == null) {
      return [];
    }

    return result.map(completion => ({
      snippet: getAutocompleteArguments() ? getText(completion) : completion.text,
      type: TYPES[completion.type],
      description: completion.description,
    }));
  }

}
