// This file is part of InvenioRequests
// Copyright (C) 2022 CERN.
//
// Invenio RDM Records is free software; you can redistribute it and/or modify it
// under the terms of the MIT License; see LICENSE file for more details.

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _get from 'lodash/get';
import {
  Button,
  Icon,
  Form,
  Message,
  Modal,
  Checkbox,
} from 'semantic-ui-react';
import { i18next } from '@translations/i18next';
import { Trans } from 'react-i18next';
import * as Yup from 'yup';
import { Formik } from 'formik';
import {
  ErrorLabel,
  TextAreaField,
  RadioField,
  ActionButton,
} from 'react-invenio-forms';

export class SubmitReviewModal extends Component {
  ConfirmSubmitReviewSchema = Yup.object({
    acceptAccessToRecord: Yup.string().required(
      i18next.t('You must click and accept this.')
    ),
    acceptAfterPublishRecord: Yup.string().required(
      i18next.t('You must click and accept this.')
    ),
    reviewComment: Yup.string(),
  });

  render() {
    const {
      initialReviewComment,
      isConfirmModalOpen,
      community,
      onClose,
      onSubmit,
    } = this.props;
    const communityTitle = community.metadata.title;
    return (
      <Formik
        initialValues={{
          acceptAccessToRecord: '',
          acceptAfterPublishRecord: '',
          reviewComment: initialReviewComment || '',
        }}
        onSubmit={onSubmit}
        validationSchema={this.ConfirmSubmitReviewSchema}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({ values, errors, touched }) => {
          return (
            <Modal
              open={isConfirmModalOpen}
              onClose={onClose}
              size="small"
              closeIcon={true}
              closeOnDimmerClick={false}
            >
              <Modal.Header>
                <Trans>Submit for review</Trans>
              </Modal.Header>
              <Modal.Content>
                <Message visible warning>
                  <p>
                    <Icon name="warning sign" />
                    {i18next.t(
                      'Before requesting review please read and check the following.'
                    )}
                  </p>
                </Message>
                <Form>
                  <Form.Field>
                    <RadioField
                      control={Checkbox}
                      fieldPath="acceptAccessToRecord"
                      label={
                        <Trans
                          defaults="The '{{communityTitle}}' curators will have access to
                 <bold>view</bold> and <bold>edit</bold> your
                 upload's metadata and files."
                          values={{
                            communityTitle,
                          }}
                          components={{ bold: <b /> }}
                        />
                      }
                      checked={
                        _get(values, 'acceptAccessToRecord') === 'checked'
                      }
                      onChange={({ event, data, formikProps }) => {
                        formikProps.form.setFieldValue(
                          'acceptAccessToRecord',
                          data.checked ? 'checked' : ''
                        );
                      }}
                      optimized
                    />
                    <ErrorLabel
                      fieldPath="acceptAccessToRecord"
                      className="mt-0 mb-5"
                    />
                  </Form.Field>
                  <Form.Field>
                    <RadioField
                      control={Checkbox}
                      fieldPath="acceptAfterPublishRecord"
                      label={
                        <Trans
                          defaults="If your upload is accepted by the community curators, it will be <bold> immediately published.</bold> Before that, you will still be able to modify metadata and files of this uploads."
                          values={{
                            communityTitle: communityTitle,
                          }}
                          components={{ bold: <b /> }}
                        />
                      }
                      checked={
                        _get(values, 'acceptAfterPublishRecord') === 'checked'
                      }
                      onChange={({ event, data, formikProps }) => {
                        formikProps.form.setFieldValue(
                          'acceptAfterPublishRecord',
                          data.checked ? 'checked' : ''
                        );
                      }}
                      optimized
                    />
                    <ErrorLabel
                      fieldPath="acceptAfterPublishRecord"
                      className="mt-0 mb-5"
                    />
                  </Form.Field>
                  <TextAreaField
                    fieldPath="reviewComment"
                    label="Message to curators (optional)"
                  />
                </Form>
              </Modal.Content>
              <Modal.Actions>
                <Button onClick={onClose} floated="left">
                  {i18next.t('Cancel')}
                </Button>
                <ActionButton
                  name="submitReview"
                  onClick={(event, formik) => {
                    formik.handleSubmit(event);
                  }}
                  positive
                  content={i18next.t('Submit review')}
                />
              </Modal.Actions>
            </Modal>
          );
        }}
      </Formik>
    );
  }
}

SubmitReviewModal.propTypes = {
  isConfirmModalOpen: PropTypes.bool.isRequired,
  community: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialReviewComment: PropTypes.string,
};
