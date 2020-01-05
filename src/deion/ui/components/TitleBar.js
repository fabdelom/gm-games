// @flow

import React from "react";
import Dropdown from "./Dropdown";
import JumpTo from "./JumpTo";
import NewWindowLink from "./NewWindowLink";
import { useLocalShallow } from "../util";

const TitleBar = () => {
	const {
		title,
		hideNewWindow,
		jumpTo,
		jumpToSeason,
		dropdownExtraParam,
		dropdownView,
		dropdownFields,
	} = useLocalShallow(state => ({
		title: state.title,
		hideNewWindow: state.hideNewWindow,
		jumpTo: state.jumpTo,
		jumpToSeason: state.jumpToSeason,
		dropdownExtraParam: state.dropdownExtraParam,
		dropdownView: state.dropdownView,
		dropdownFields: state.dropdownFields,
	}));

	if (title === undefined) {
		return null;
	}

	return (
		<div className="py-2 mb-2 title-bar d-flex navbar-border">
			<h1 className="mb-0">
				{title}
				{!hideNewWindow ? <NewWindowLink /> : null}
			</h1>
			{dropdownView ? (
				<Dropdown
					extraParam={dropdownExtraParam}
					view={dropdownView}
					fields={Object.keys(dropdownFields)}
					values={Object.values(dropdownFields)}
				/>
			) : null}
			{jumpTo ? <JumpTo season={jumpToSeason} /> : null}
		</div>
	);
};

export default TitleBar;