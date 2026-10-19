// Function catalogue for autocomplete and signature help. Parameters: [optional], trailing … = repeatable.
// Parameter kinds are inferred from names: table*, column*/dates, interval, everything else is an expression.
const RAW = [
  ['CALCULATE', 'expression, [filter1], [filter2], …', 'Evaluates an expression in a filter context that you modify with the filters.', 'Filter'],
  ['CALCULATETABLE', 'table, [filter1], [filter2], …', 'Evaluates a table expression in a modified filter context.', 'Filter'],
  ['FILTER', 'table, condition', 'Returns the rows of a table for which the condition is true.', 'Filter'],
  ['ALL', 'tableOrColumn, [column2], …', 'Returns all rows or values, ignoring filters. Inside CALCULATE it removes filters.', 'Filter'],
  ['ALLEXCEPT', 'table, column1, [column2], …', 'Removes filters from the table except those on the listed columns.', 'Filter'],
  ['ALLSELECTED', '[tableOrColumn]', 'Removes context filters but keeps the filters from outside the visual.', 'Filter'],
  ['REMOVEFILTERS', '[tableOrColumn], …', 'Clears filters. Use it as a CALCULATE filter argument.', 'Filter'],
  ['KEEPFILTERS', 'filter', 'Adds a filter without replacing the existing filters on the same column.', 'Filter'],
  ['VALUES', 'tableOrColumn', 'Distinct values of a column in the current filter context (or the visible rows of a table).', 'Filter'],
  ['DISTINCT', 'tableOrColumn', 'Distinct values of a column, or a table without duplicate rows.', 'Filter'],
  ['TREATAS', 'table, column1, [column2], …', 'Applies the values of a table as filters on the given columns.', 'Filter'],
  ['RELATED', 'column', 'Returns a value from the one side of a relationship, from a row context.', 'Filter'],
  ['RELATEDTABLE', 'table', 'Returns the related rows from the many side of a relationship.', 'Filter'],
  ['LOOKUPVALUE', 'resultColumn, searchColumn1, searchValue1, …', 'Returns the value of a column for the row that matches the search values.', 'Filter'],
  ['SELECTEDVALUE', 'column, [alternateResult]', 'Returns the value when the column has exactly one visible value, otherwise the alternate result.', 'Filter'],
  ['HASONEVALUE', 'column', 'TRUE when the column has exactly one visible value.', 'Filter'],
  ['ADDCOLUMNS', 'table, name1, expression1, …', 'Adds calculated columns to a table.', 'Table'],
  ['SELECTCOLUMNS', 'table, name1, expression1, …', 'Returns a table with the columns you define.', 'Table'],
  ['SUMMARIZE', 'table, groupByColumn1, …, [name, expression], …', 'Groups a table by columns and adds calculated columns.', 'Table'],
  ['TOPN', 'n, table, orderBy, [order]', 'Returns the top n rows of a table by an expression.', 'Table'],
  ['UNION', 'table1, table2, …', 'Combines the rows of tables with the same columns.', 'Table'],
  ['INTERSECT', 'table1, table2', 'Returns the rows of table1 that also appear in table2.', 'Table'],
  ['EXCEPT', 'table1, table2', 'Returns the rows of table1 that do not appear in table2.', 'Table'],
  ['ISEMPTY', 'table', 'TRUE when the table has no rows.', 'Table'],
  ['CONTAINSROW', 'table, value1, [value2], …', 'TRUE when a row with these values exists in the table.', 'Table'],
  ['CONTAINS', 'table, column1, value1, …', 'TRUE when the table has a row matching all the column/value pairs.', 'Table'],
  ['SUM', 'column', 'Adds up the numbers in a column.', 'Aggregation'],
  ['AVERAGE', 'column', 'Average of the numbers in a column.', 'Aggregation'],
  ['MIN', 'columnOrValue1, [value2]', 'Smallest value of a column, or of two values.', 'Aggregation'],
  ['MAX', 'columnOrValue1, [value2]', 'Largest value of a column, or of two values.', 'Aggregation'],
  ['COUNT', 'column', 'Counts the numeric values in a column.', 'Aggregation'],
  ['COUNTA', 'column', 'Counts the non-blank values in a column.', 'Aggregation'],
  ['COUNTBLANK', 'column', 'Counts the blank values in a column.', 'Aggregation'],
  ['DISTINCTCOUNT', 'column', 'Counts the distinct values in a column.', 'Aggregation'],
  ['COUNTROWS', 'table', 'Counts the rows of a table or table expression.', 'Aggregation'],
  ['SUMX', 'table, expression', 'Evaluates the expression for every row of the table and adds the results.', 'Iterator'],
  ['AVERAGEX', 'table, expression', 'Average of an expression evaluated for every row of a table.', 'Iterator'],
  ['MINX', 'table, expression', 'Smallest value of an expression over the rows of a table.', 'Iterator'],
  ['MAXX', 'table, expression', 'Largest value of an expression over the rows of a table.', 'Iterator'],
  ['COUNTX', 'table, expression', 'Counts the numeric results of an expression over the rows of a table.', 'Iterator'],
  ['IF', 'condition, resultIfTrue, [resultIfFalse]', 'Returns one value if the condition is true and another if it is false.', 'Logic'],
  ['SWITCH', 'expression, value1, result1, …, [else]', 'Compares an expression with values and returns the matching result.', 'Logic'],
  ['AND', 'logical1, logical2', 'TRUE when both conditions are true.', 'Logic'],
  ['OR', 'logical1, logical2', 'TRUE when at least one condition is true.', 'Logic'],
  ['NOT', 'logical', 'Reverses TRUE and FALSE.', 'Logic'],
  ['TRUE', '', 'Returns TRUE.', 'Logic'],
  ['FALSE', '', 'Returns FALSE.', 'Logic'],
  ['BLANK', '', 'Returns a blank.', 'Logic'],
  ['ISBLANK', 'value', 'TRUE when the value is blank.', 'Logic'],
  ['IFERROR', 'value, valueIfError', 'Returns the value, or the alternative if the value is an error.', 'Logic'],
  ['COALESCE', 'value1, value2, …', 'Returns the first value that is not blank.', 'Logic'],
  ['DIVIDE', 'numerator, denominator, [alternateResult]', 'Safe division: returns the alternate result (blank by default) when dividing by zero.', 'Math'],
  ['ABS', 'number', 'Absolute value.', 'Math'],
  ['INT', 'number', 'Rounds down to the nearest integer.', 'Math'],
  ['ROUND', 'number, digits', 'Rounds a number to the given number of digits.', 'Math'],
  ['DATE', 'year, month, day', 'Builds a date. Months and days can overflow into the next period.', 'Date'],
  ['YEAR', 'date', 'Year of a date.', 'Date'],
  ['MONTH', 'date', 'Month number of a date.', 'Date'],
  ['DAY', 'date', 'Day of the month.', 'Date'],
  ['EDATE', 'date, months', 'The date that many months before or after.', 'Date'],
  ['EOMONTH', 'date, months', 'The last day of the month, that many months before or after.', 'Date'],
  ['DATEADD', 'dates, numberOfIntervals, interval', 'Shifts the dates in the current context by days, months, quarters or years.', 'Time intelligence'],
  ['SAMEPERIODLASTYEAR', 'dates', 'The same dates one year earlier.', 'Time intelligence'],
  ['PARALLELPERIOD', 'dates, numberOfIntervals, interval', 'Shifts the complete periods (month, quarter, year) of the current dates.', 'Time intelligence'],
  ['PREVIOUSDAY', 'dates', 'The day before the first date in the context.', 'Time intelligence'],
  ['NEXTDAY', 'dates', 'The day after the first date in the context.', 'Time intelligence'],
  ['PREVIOUSMONTH', 'dates', 'The whole month before the first date in the context.', 'Time intelligence'],
  ['NEXTMONTH', 'dates', 'The whole month after the first date in the context.', 'Time intelligence'],
  ['PREVIOUSQUARTER', 'dates', 'The whole quarter before the first date in the context.', 'Time intelligence'],
  ['PREVIOUSYEAR', 'dates', 'The whole year before the first date in the context.', 'Time intelligence'],
  ['DATESBETWEEN', 'dates, startDate, endDate', 'Dates from the start date to the end date.', 'Time intelligence'],
  ['DATESINPERIOD', 'dates, startDate, numberOfIntervals, interval', 'Dates in a period that starts at a date and spans a number of intervals.', 'Time intelligence'],
  ['DATESMTD', 'dates', 'Dates from the start of the month to the last date in the context.', 'Time intelligence'],
  ['DATESQTD', 'dates', 'Dates from the start of the quarter to the last date in the context.', 'Time intelligence'],
  ['DATESYTD', 'dates', 'Dates from the start of the year to the last date in the context.', 'Time intelligence'],
  ['FIRSTDATE', 'dates', 'The first date in the current context.', 'Time intelligence'],
  ['LASTDATE', 'dates', 'The last date in the current context.', 'Time intelligence'],
];

function kindOf(name) {
  const n = name.toLowerCase();
  if (n === 'interval') return 'interval';
  if (n === 'tableorcolumn') return 'tableOrColumn';
  if (n.startsWith('table')) return 'table';
  if (n.startsWith('column') || n === 'dates' || n.startsWith('groupby')) return 'column';
  return 'expression';
}

export const FUNCTIONS = RAW.map(([name, sig, doc, category]) => {
  const parts = sig.split(',').map(s => s.trim()).filter(Boolean);
  // A lone "…" means the previous parameter repeats.
  const repeatsLast = parts[parts.length - 1] === '…';
  const params = parts.filter(s => s !== '…').map(s => {
    const repeat = s.includes('…');
    const optional = s.startsWith('[');
    const label = s.replace(/[\[\]…]/g, '').trim();
    return { label, optional, repeat, kind: kindOf(label) };
  });
  if (repeatsLast && params.length) params[params.length - 1].repeat = true;
  return { name, params, signature: `${name}(${sig})`, doc, category };
});

export const FUNCTION_MAP = new Map(FUNCTIONS.map(f => [f.name, f]));
export const KEYWORDS = [
  { name: 'VAR', doc: 'Declares a variable: VAR Name = expression. A variable is calculated once, where it is declared.' },
  { name: 'RETURN', doc: 'Ends the VAR declarations and gives the result of the formula.' },
];
export const INTERVALS = ['DAY', 'MONTH', 'QUARTER', 'YEAR'];
