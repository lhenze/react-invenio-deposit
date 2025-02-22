// This file is part of React-Invenio-Deposit
// Copyright (C) 2020-2022 CERN.
// Copyright (C) 2020-2022 Northwestern University.
//
// React-Invenio-Deposit is free software; you can redistribute it and/or modify it
// under the terms of the MIT License; see LICENSE file for more details.

import _isEmpty from 'lodash/isEmpty';
import _isString from 'lodash/isString';
import {
  DISCARD_PID_FAILED,
  DISCARD_PID_STARTED,
  DISCARD_PID_SUCCEEDED,
  DRAFT_DELETE_FAILED,
  DRAFT_DELETE_STARTED,
  DRAFT_FETCHED,
  DRAFT_HAS_VALIDATION_ERRORS,
  DRAFT_PREVIEW_FAILED,
  DRAFT_PREVIEW_STARTED,
  DRAFT_PUBLISH_FAILED,
  DRAFT_PUBLISH_FAILED_WITH_VALIDATION_ERRORS,
  DRAFT_PUBLISH_STARTED,
  DRAFT_SAVE_FAILED,
  DRAFT_SAVE_STARTED,
  DRAFT_SAVE_SUCCEEDED,
  DRAFT_SUBMIT_REVIEW_FAILED,
  DRAFT_SUBMIT_REVIEW_FAILED_WITH_VALIDATION_ERRORS,
  DRAFT_SUBMIT_REVIEW_STARTED,
  RESERVE_PID_FAILED,
  RESERVE_PID_STARTED,
  RESERVE_PID_SUCCEEDED,
  SET_COMMUNITY,
} from '../types';

export class DepositStatus {
  static DRAFT = 'draft';
  static NEW_VERSION_DRAFT = 'new_version_draft';
  static DRAFT_WITH_REVIEW = 'draft_with_review';
  static IN_REVIEW = 'in_review';
  static DECLINED = 'declined';
  static EXPIRED = 'expired';
  static PUBLISHED = 'published';

  static allowsReviewDeletionStates = [
    DepositStatus.DRAFT_WITH_REVIEW,
    DepositStatus.DECLINED,
    DepositStatus.EXPIRED,
  ];

  static allowsReviewUpdateStates = [
    DepositStatus.DRAFT_WITH_REVIEW,
    DepositStatus.DECLINED,
    DepositStatus.EXPIRED,
    DepositStatus.DRAFT,
  ];

  static disallowsSubmitForReviewStates = [
    DepositStatus.PUBLISHED,
    DepositStatus.IN_REVIEW,
    DepositStatus.NEW_VERSION_DRAFT,
  ];
}

function hasStatus(record, statuses = []) {
  return statuses.includes(record.status);
}

function getSelectedCommunityMetadata(record, selectedCommunity) {
  function mockCommunityMetadata(community) {
    if (_isString(community)) {
      return {
        id: community,
        uuid: community,
        metadata: {
          title: community,
          description: community,
          type: 'Type',
        },
        links: {
          self_html: '/',
        },
      };
    }
    return {
      id: community?.id,
      uuid: community?.uuid,
      metadata: {
        title: community?.metadata?.title,
        description:
          community.metadata?.description || community.metadata?.title,
        type: 'Type',
      },
      links: {
        self_html: '/',
      },
    };
  }
  switch (selectedCommunity) {
    case undefined:
      // when `undefined`, retrieve the community from the record, if previously selected
      const _community = hasStatus(record, [
        DepositStatus.PUBLISHED,
        DepositStatus.NEW_VERSION_DRAFT,
      ])
        ? record.parent?.communities?.default
        : record.parent?.review?.receiver?.community;
      return _community ? mockCommunityMetadata(_community) : undefined;
    case null:
      // when value is `null`, the selected community was deselected
      return null;
    default:
      // FIXME
      // needed until backend will resolve community and return an obj instead of UUID only
      return mockCommunityMetadata(selectedCommunity);
  }
}

/**
 * Given a draft and optionally a newly selected community, it computes multiple states. The computed
 * states are split in 2 namespaces, `ui` and `actions`. The former is holding state regarding
 * the UI components while the later holds the state that is used on redux actions. More specifically:
 *
 * - `actions.shouldUpdateReview`: true if the review associated with the draft needs to be updated or created i.e
 * all of the following are true:
 *     - user has selected a community
 *     - the selected community has a saved request in the backend
 *     - the draft status is one of `DepositStatus.allowsReviewUpdateStates`
 *     - the community selected for the draft has not a declined/expired request associated with it
 * - `actions.shouldDeleteReview`: true if the review associated with the draft needs to be deleted i.e
 * all of the following are true:
 *     - user has deselected a community
 *     - the draft status is one of `DepositStatus.allowsReviewDeletionStates`
 * - `actions.communityStateMustBeChecked`: true if one of the `shouldUpdateReview` or `shouldDeleteReview` is true
 * - `ui.showSubmitForReviewButton`: true if all of the following are true:
 *     - user has selected a community
 *     - the associated review for the selected community is not declined/expired
 *     - the record is not published
 * - `ui.disableSubmitForReviewButton`: true if all the following are true
 *     - `ui.showSubmitForReviewButton` is true
 *     - the draft status is one of `DepositStatus.disallowsSubmitForReviewStates`
 * - `ui.showChangeCommunityButton`: true if the associated review for the selected community is declined/expired
 * - `ui.showCommunitySelectionButton`: true if the record is not published
 * - `ui.disableCommunitySelectionButton`: true `ui.showCommunitySelectionButton` is true and any of the following is true:
 *     - the associated review for the selected community is declined/expired
 *     - the draft status is one of `DepositStatus.disallowsSubmitForReviewStates` and `ui.hideCommunityHeader` is false
 * - `ui.hideCommunityHeader`: true if all of the following is true:
 *     - the draft is published
 *     - the `record.parent.communities` is empty i.e the record was published without a community selected.
 *
 * When the `selectedCommunity` param is omitted, it will retrieve the community from the draft, if any.
 *
 * @param {object} record: the latest version of the record
 * @param {object} selectedCommunity: the selected community, `null` to deselect.
 * @returns a new state for the deposit form
 */
export function computeDepositState(record, selectedCommunity = undefined) {
  const depositStatusAllowsReviewDeletion = hasStatus(
    record,
    DepositStatus.allowsReviewDeletionStates
  );
  const depositStatusAllowsReviewUpdate = hasStatus(
    record,
    DepositStatus.allowsReviewUpdateStates
  );
  const depositStatusDisallowsSubmitForReview = hasStatus(
    record,
    DepositStatus.disallowsSubmitForReviewStates
  );

  // Serialize selectedCommunity
  let _selectedCommunity = getSelectedCommunityMetadata(
    record,
    selectedCommunity
  );

  const communityIsSelected = !_isEmpty(_selectedCommunity);

  const draftReview = record?.parent?.review;

  // check if the selected community has a request created
  const isReviewForSelectedCommunityCreated =
    hasStatus(record, [DepositStatus.DRAFT_WITH_REVIEW]) &&
    draftReview?.receiver?.community === _selectedCommunity?.uuid;

  // check if the selected community has a declined or expired request
  const isReviewForSelectedCommunityDeclinedOrExpired =
    hasStatus(record, [DepositStatus.DECLINED, DepositStatus.EXPIRED]) &&
    draftReview?.receiver?.community === _selectedCommunity?.uuid;

  // check if the record is published without a community selected
  const isRecordPublishedWithoutCommunity =
    hasStatus(record, [
      DepositStatus.PUBLISHED,
      DepositStatus.NEW_VERSION_DRAFT,
    ]) && _isEmpty(record.parent?.communities);

  // show submit for review button conditions extracted to be reused
  const _showSubmitReviewButton =
    communityIsSelected &&
    !isReviewForSelectedCommunityDeclinedOrExpired &&
    !hasStatus(record, [
      DepositStatus.PUBLISHED,
      DepositStatus.NEW_VERSION_DRAFT,
    ]);

  // show community selection button conditions extracted to be reused
  const _showCommunitySelectionButton = !hasStatus(record, [
    DepositStatus.PUBLISHED,
    DepositStatus.NEW_VERSION_DRAFT,
  ]);

  const shouldUpdateReview =
    communityIsSelected &&
    depositStatusAllowsReviewUpdate &&
    !isReviewForSelectedCommunityCreated &&
    !isReviewForSelectedCommunityDeclinedOrExpired;

  const shouldDeleteReview =
    !communityIsSelected && depositStatusAllowsReviewDeletion;

  const _disableCommunitySelectionButton =
    _showCommunitySelectionButton &&
    (isReviewForSelectedCommunityDeclinedOrExpired ||
      (depositStatusDisallowsSubmitForReview &&
        !isRecordPublishedWithoutCommunity));

  return {
    selectedCommunity: _selectedCommunity,
    ui: {
      showSubmitForReviewButton: _showSubmitReviewButton,
      disableSubmitForReviewButton:
        _showSubmitReviewButton && depositStatusDisallowsSubmitForReview,
      showChangeCommunityButton: isReviewForSelectedCommunityDeclinedOrExpired,
      showCommunitySelectionButton: _showCommunitySelectionButton,
      hideCommunityHeader: isRecordPublishedWithoutCommunity,
      disableCommunitySelectionButton: _disableCommunitySelectionButton,
    },
    actions: {
      shouldUpdateReview,
      shouldDeleteReview,
      communityStateMustBeChecked: shouldUpdateReview || shouldDeleteReview,
    },
  };
}

const depositReducer = (state = {}, action) => {
  switch (action.type) {
    case DRAFT_SAVE_STARTED:
    case DRAFT_PUBLISH_STARTED:
    case DRAFT_DELETE_STARTED:
    case DRAFT_PREVIEW_STARTED:
      return {
        ...state,
        actionState: action.type,
      };
    case DRAFT_SUBMIT_REVIEW_STARTED:
      return {
        ...state,
        actionState: action.type,
        actionStateExtra: { reviewComment: action.payload.reviewComment },
      };
    case RESERVE_PID_STARTED:
    case DISCARD_PID_STARTED:
      return {
        ...state,
        actionState: action.type,
        actionStateExtra: { pidType: action.payload.pidType },
      };
    case DRAFT_FETCHED:
    case DRAFT_SAVE_SUCCEEDED:
    case RESERVE_PID_SUCCEEDED:
    case DISCARD_PID_SUCCEEDED:
      return {
        ...state,
        record: {
          ...state.record,
          ...action.payload.data,
        },
        editorState: computeDepositState(
          action.payload.data,
          state.editorState.selectedCommunity
        ),
        errors: {},
        actionState: action.type,
        actionStateExtra: {},
      };
    case DRAFT_HAS_VALIDATION_ERRORS:
    case DRAFT_PUBLISH_FAILED_WITH_VALIDATION_ERRORS:
    case DRAFT_SUBMIT_REVIEW_FAILED_WITH_VALIDATION_ERRORS:
      return {
        ...state,
        record: {
          ...state.record,
          ...action.payload.data,
        },
        editorState: computeDepositState(
          action.payload.data,
          state.editorState.selectedCommunity
        ),
        errors: { ...action.payload.errors },
        actionState: action.type,
      };
    case DRAFT_SAVE_FAILED:
    case DRAFT_PUBLISH_FAILED:
    case DRAFT_DELETE_FAILED:
    case DRAFT_PREVIEW_FAILED:
    case RESERVE_PID_FAILED:
    case DISCARD_PID_FAILED:
    case DRAFT_SUBMIT_REVIEW_FAILED:
      return {
        ...state,
        errors: { ...action.payload.errors },
        actionState: action.type,
        actionStateExtra: {},
      };
    case SET_COMMUNITY:
      return {
        ...state,
        editorState: computeDepositState(
          state.record,
          action.payload.community
        ),
      };
    default:
      return state;
  }
};

export default depositReducer;
