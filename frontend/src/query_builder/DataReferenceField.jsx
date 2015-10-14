import React, { Component, PropTypes } from "react";

import DataReferenceQueryButton from './DataReferenceQueryButton.jsx';
import Icon from "metabase/components/Icon.jsx";
import Query from "metabase/lib/query";
import inflection from 'inflection';

import cx from "classnames";

export default class DataReferenceField extends Component {
    constructor(props, context) {
        super(props, context);
        this.filterBy = this.filterBy.bind(this);
        this.groupBy = this.groupBy.bind(this);
        this.setQueryCountGroupedBy = this.setQueryCountGroupedBy.bind(this);
        this.setQueryDistinct = this.setQueryDistinct.bind(this);
        this.setQuerySum = this.setQuerySum.bind(this);

        this.state = {
            table: undefined,
            tableForeignKeys: undefined
        };
    }

    static propTypes = {
        loadTableFn: PropTypes.func.isRequired,
        runQueryFn: PropTypes.func.isRequired,
        setQueryFn: PropTypes.func.isRequired,
        setDatabaseFn: PropTypes.func.isRequired,
        setSourceTableFn: PropTypes.func.isRequired,
        setDisplayFn: PropTypes.func.isRequired
    };

    componentWillMount() {
        this.props.loadTableFn(this.props.field.table_id).then((result) => {
            this.setState({
                table: result.metadata,
                tableForeignKeys: result.foreignKeys
            });
        });
    }

    filterBy() {
        var query = this.setDatabaseAndTable();
        // Add an aggregation so both aggregation and filter popovers aren't visible
        if (!Query.hasValidAggregation(query.query)) {
            Query.updateAggregation(query.query, ["rows"]);
        }
        Query.addFilter(query.query);
        Query.updateFilter(query.query, Query.getFilters(query.query).length - 1, [null, this.props.field.id, null]);
        this.setQuery(query, false);
    }

    groupBy() {
        var query = this.setDatabaseAndTable();
        if (!Query.hasValidAggregation(query.query)) {
            Query.updateAggregation(query.query, ["rows"]);
        }
        Query.addDimension(query.query);
        Query.updateDimension(query.query, this.props.field.id, query.query.breakout.length - 1);
        this.setQuery(query);
    }

    setQuerySum() {
        var query = this.setDatabaseAndTable();
        query.query.aggregation = ["sum", this.props.field.id];
        query.query.breakout = [];
        query.query.filter = [];
        this.setQuery(query);
    }

    setQueryDistinct() {
        var query = this.setDatabaseAndTable();
        query.query.aggregation = ["rows"];
        query.query.breakout = [this.props.field.id];
        query.query.filter = [];
        this.setQuery(query);
    }

    setQueryCountGroupedBy(chartType) {
        var query = this.setDatabaseAndTable();
        query.query.aggregation = ["count"];
        query.query.breakout = [this.props.field.id];
        query.query.filter = [];
        this.setQuery(query);
        this.props.setDisplayFn(chartType);
    }

    setDatabaseAndTable() {
        var query;
        query = this.props.setDatabaseFn(this.state.table.db_id);
        query = this.props.setSourceTableFn(this.state.table.id);
        return query;
    }

    setQuery(query, run = true) {
        this.props.setQueryFn(query);
        if (run) {
            this.props.runQueryFn();
        }
    }

    render() {
        var fieldName = this.props.field.display_name;
        var tableName = this.state.table ? this.state.table.display_name : "";

        var validForCurrentQuestion = !this.props.query.query || this.props.query.query.source_table == undefined || this.props.query.query.source_table === this.props.field.table_id;

        var useForCurrentQuestion;
        if (validForCurrentQuestion) {
            var validBreakout = this.state.table && this.state.table.breakout_options.validFieldsFilter(this.state.table.fields).filter((f) => {
                return f.id === this.props.field.id;
            }).length > 0;
            var useForCurrentQuestionArray = [];
            useForCurrentQuestionArray.push(
                <li key="filter-by" className="mt1">
                    <a className="Button Button--white text-default text-brand-hover border-brand-hover no-decoration" href="#" onClick={this.filterBy}>
                        <Icon className="mr1" name="add" width="12px" height="12px"/> Filter by {name}
                        </a>
                </li>
            );
            if (validBreakout) {
                useForCurrentQuestionArray.push(
                    <li key="group-by" className="mt1">
                        <a className="Button Button--white text-default text-brand-hover border-brand-hover no-decoration" href="#" onClick={this.groupBy}>
                            <Icon className="mr2" name="add" width="12px" height="12px" /> Group by {name}
                        </a>
                    </li>
                );
            }
            useForCurrentQuestion = (
                <div>
                    <p className="text-bold">Use for current question</p>
                    <ul className="my2">{useForCurrentQuestionArray}</ul>
                </div>
            );
        }

        var usefulQuestions = [];
        if (this.props.field.special_type === "number") {
            usefulQuestions.push(<li className="border-row-divider" key="sum"><DataReferenceQueryButton icon="illustration-icon-scalar" text={"Sum of all values of " + fieldName} onClick={this.setQuerySum} /></li>);
        }
        usefulQuestions.push(<li className="border-row-divider" key="distinct-values"><DataReferenceQueryButton icon="illustration-icon-table" text={"All distinct values of " + fieldName} onClick={this.setQueryDistinct} /></li>);
        var queryCountGroupedByText = "Number of " + inflection.pluralize(tableName) + " grouped by " + fieldName;
        usefulQuestions.push(<li className="border-row-divider" key="count-bar"><DataReferenceQueryButton icon="illustration-icon-bars" text={queryCountGroupedByText} onClick={this.setQueryCountGroupedBy.bind(null, "bar")} /></li>);
        usefulQuestions.push(<li className="border-row-divider" key="count-pie"><DataReferenceQueryButton icon="illustration-icon-pie" text={queryCountGroupedByText} onClick={this.setQueryCountGroupedBy.bind(null, "pie")} /></li>);

        var descriptionClasses = cx({ "text-grey-3": !this.props.field.description });
        var description = (<p className={descriptionClasses}>{this.props.field.description || "No description set."}</p>);

        return (
            <div>
                <h1>{fieldName}</h1>
                {description}
                {useForCurrentQuestion}
                <p className="text-bold">Potentially useful questions</p>
                <ul>{usefulQuestions}</ul>
            </div>
        );
    }
}