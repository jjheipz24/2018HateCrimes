let stateChoice = document.querySelector('#state');
let backButton = document.querySelector('#back');
//let legend = document.querySelector('#legend');
let parseDate = d3.timeParse("%d-%b-%y");
let formatDate = d3.timeFormat('%b %d, %Y');
let formatMonth = d3.timeFormat("%b");
let fullMonth = d3.timeFormat("%B");
let format = d3.format(',d');

let fullDataset; //the original dataset
let currentDataset; //sets the current state dataset being manipulated
let mappedMonths; //creates a map of each month and the number of records in each month
let newMonthData; //holds the data from the mappedMonths in a new array of objects
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let workingData;

let w = 650;
let h = 600;
let margin = {
    top: 40,
    right: 50,
    left: 55,
    bottom: 50
};

let barSvg, sunburstSvg, legendSvg;
let xScale, yScale;
let xAxis, yAxis;
let radius = w / 2;
let zoomRad = (w / 6) - 10;
let totalSize; //used for total size of values in sunburst. Has to be global to be accessed in mouse event function
let nameLabel, textLength;

function rowConverter(d) {
    return {
        date: parseDate(d.INCIDENT_DATE),
        state: d.STATE_NAME,
        agency: d.PUB_AGENCY_NAME,
        category: d.MAIN_GROUP,
        bias: d.BIAS_DESC,
        offender: d.OFFENDER_RACE,
        offense: d.OFFENSE_NAME,
        numVictims: d.TOTAL_VICTIMS
    }
}

//Creates the dataset for the specific state
//returns the new dataset for the bar graph
function createStateDataset(data) {
    currentDataset = filter(data, d => d.state === stateChoice.value);
    currentDataset = currentDataset.sort((a, b) => a.date - b.date);
    //console.log(currentDataset);

    mappedMonths = d3.rollup(currentDataset, v => v.length, d => formatMonth(d.date));

    //Adds a value for every month --> not just the months that have records
    for (let i = 0; i < months.length; i++) {
        if (!mappedMonths.has(months[i])) {
            mappedMonths.set(months[i], 0);
        }
    }
    //console.log(mappedMonths);

    //Turns the mapped data into an array of objects to access the keys and values
    newMonthData = Array.from(mappedMonths, ([key, value]) =>
        ({
            month: key,
            count: value
        }));

    //Puts the months in order
    newMonthData = newMonthData.sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month));

    //console.log(newMonthData);

    return newMonthData;
}

//Creates the initial bar graph
function createInitialBarGraph(data) {
    //legend.style.display = "none"; //toggles the legend off
    backButton.style.display = "none"; //toggles the back button off
    workingData = createStateDataset(data); //calls the function to get the new dataset

    xScale = d3.scaleBand()
        .domain(months)
        .range([0, w - margin.right])
        .paddingInner(0.3);

    yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([h - margin.bottom, margin.top]);

    barSvg = d3.select('#chart')
        .attr('width', w)
        .attr('height', h);

    barSvg.selectAll('rect')
        .data(workingData)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.month) + margin.left + 3)
        .attr('y', d => yScale(d.count))
        .attr('width', (w - 50) / 12 - 20)
        .attr('height', d => (h - margin.bottom) - yScale(d.count))
        .attr('fill', "#003D71")
        .attr('opacity', 0.8)
        .call(mouseEvents);

    barSvg.selectAll('text')
        .data(workingData)
        .enter()
        .append('text')
        .classed('numTotal', true)
        .attr('x', d => xScale(d.month) + margin.left + 17)
        .attr('y', d => yScale(d.count) - 8)
        .text(d => d.count > 0 ? d.count : "")
        .style('fill', '#003D71')
        .style('text-anchor', 'middle');

    //AXES
    xAxis = barSvg.append('g')
        .attr('id', 'xAxis')
        .classed('axis', true)
        .attr('transform', `translate(${margin.left}, ${h - margin.bottom})`)
        .call(
            d3.axisBottom()
            .scale(xScale)
            .tickValues(months)
        );


    yAxis = barSvg.append('g')
        .attr('id', 'yAxis')
        .classed('axis', true)
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft()
            .scale(yScale)
            .ticks(10)
        );

    //LABELS
    //graph title
    barSvg.append('text')
        .classed('chart-title', true)
        .attr('id', 'bar-title')
        .attr('text-anchor', 'middle')
        .attr('x', (w / 2) + 20)
        .attr('y', margin.top / 2)
        .text('Number of Reported Hate Crimes By Month')
    //x-axis
    barSvg.append('text')
        .classed('axis-label', true)
        .attr('text-anchor', 'middle')
        .attr('x', (w / 2) + 20)
        .attr('y', h)
        .text('Months');
    //y-axis
    barSvg.append('text')
        .classed('axis-label', true)
        .attr('transform', 'rotate(-90)')
        .attr('text-anchor', 'middle')
        .attr('x', -(h / 2) + 10)
        .attr('y', 20)
        .text('Reported Cases');

}

function updateBarGraph(data) {
    //puts the chart back to the original height
    h = 600;
    barSvg.attr('height', h);

    backButton.style.display = "none"; //toggles the back button off
    workingData = createStateDataset(data);

    barSvg.selectAll('rect')
        .data(workingData)
        .join('rect')
        .transition()
        .duration(2000)
        .ease(d3.easeCubicInOut)
        .attr('x', d => xScale(d.month) + margin.left + 3)
        .attr('y', d => yScale(d.count))
        .attr('width', (w - 50) / 12 - 20)
        .attr('height', d => (h - margin.bottom) - yScale(d.count))
        .attr('fill', "#003D71")
        .style('opacity', 0.8)
        .style('display', 'block');

    barSvg.selectAll('.numTotal')
        .data(workingData)
        .join('text')
        .style('opacity', 0)
        .attr('x', d => xScale(d.month) + margin.left + 17)
        .attr('y', d => yScale(d.count) - 8)
        .text(d => d.count > 0 ? d.count : "")
        .style('fill', '#003D71')
        .style('text-anchor', 'middle')
        .transition()
        .delay(1700)
        .duration(750)
        .style('opacity', 0.8)
        .style('display', 'block');

    //fades in the title, axes, and axis labels
    //fades out the sunburst
    fadeIn('#bar-title');
    fadeIn('.axis');
    fadeIn('.axis-label');

    d3.selectAll('.nameLabel')
        .remove();
    fadeOut('#sunburst-title');
    fadeOut('.sunburst-arcs');
    fadeOut('.sunburst-text');
    fadeOut('.sunburst-center');
    fadeOut('.legendSvg');

}

function setupHierarchy(data) {

    // Derive Data
    const byCategory = d => d.category;
    const byBias = d => d.bias;
    const byDate = d => formatDate(d.date);
    const byAgency = d => d.agency;

    const newData = d3.rollup(data, d => d.length, byCategory, byBias, byAgency, byDate);
    //console.log('Dataset:\n', newData);

    let root = d3.hierarchy(newData, d => d instanceof Map ? [...d.values()] : null)
        .sum(d => typeof d === 'number' ? d : 0);

    root.eachBefore(node => {
        if (node.children) { //if the node has a child
            const dataArray = [...node.data]; //add the data to the dataArray
            node.children.forEach((childNode, i) => { //for each child of the node
                //check if the dataArray[i][1] is a map
                //if it is, set the name of the child to dataArray[i][0]
                childNode.name = dataArray[i][1] instanceof Map ?
                    dataArray[i][0] :
                    `${dataArray[i][0]}`
            });
        }
    });
    root.name = "Root";

    //console.log('Root:\n', root);

    return root;
}

function createLegend() {

    let colorScale = d3.scaleOrdinal()
        .domain(["Race", "Religion", "Disability", "Gender Identity", "Sexual Orientation"])
        .range(["#E63E62", "#F8D568", "#1CAC78", "#0072BB", "#7851A9"]);

    legendSvg = d3.select('#sunburst-group')
        .append('svg')
        .attr('width', 150)
        .attr('height', h)
        .classed('legendSvg', true);

    legendSvg.append('g')
        .classed('legend', true)
        .attr('transform', `translate(0, ${h / 4})`)
        .attr('opacity', '0')
        .transition()
        .duration(700)
        .attr('opacity', '0.75');

    let legendViz = d3.legendColor()
        .shapePadding(20)
        .labelAlign('end')
        .scale(colorScale);

    legendSvg.select('.legend')
        .call(legendViz);


}

function zoomableSunburst(dataset, month) {

    backButton.style.display = "block"; //toggles back button on

    let root = setupHierarchy(dataset);
    const partition = d3.partition()
        .size([2 * Math.PI, root.height + 1]);

    root = partition(root);
    root.each(d => d.current = d);

    totalSize = root.descendants()[0].value; //get the total value of all of the data

    let colorScale = d3.scaleOrdinal()
        .domain(["Race", "Religion", "Disability", "Gender Identity", "Sexual Orientation"])
        .range(["#E63E62", "#F8D568", "#1CAC78", "#0072BB", "#7851A9"]);

    let arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(zoomRad * 2)
        .innerRadius(d => d.y0 * zoomRad)
        .outerRadius(d => Math.max(d.y0 * zoomRad, d.y1 * zoomRad - 1));

    sunburstSvg = d3.select('#chart')
        .attr('width', w)
        .attr('height', h + 100);

    //creates the label inside the center of the sunburst
    nameLabel = sunburstSvg.append('text')
        .classed('nameLabel', true)
        .attr('x', w / 2)
        .attr('y', h / 2 + 50)
        .attr('text-anchor', 'middle')
        .text("");

    const g = sunburstSvg.append('g')
        .attr('transform', `translate(${w / 2}, ${(h / 2) + 50})`)
        .attr('opacity', 0);
        
        g.transition().duration(700).ease(d3.easeCubicIn).attr('opacity', 1);

    const path = g.append('g')
        .selectAll('path')
        .data(root.descendants().slice(1))
        .join('path')
        .classed('sunburst-arcs', true)
        .attr('fill', d => {
            while (d.depth > 1)
                d = d.parent;
            return colorScale(d.name);
        })
        .attr('fill-opacity', d => arcVisible(d.current) ? (d.depth === 1 ? 0.8 : d.depth === 2 ? 0.7 : d.depth === 3 ? 0.45 : d.depth === 4 ? 0.25 : 0.25) : 0)
        .attr('d', d => arc(d.current));

    //Created a clip-path for the sunburst to keep rings viewable as the only ones that can be hovered
    sunburstSvg.append('defs')
        .append('clipPath')
        .attr('id', 'clip')
        .append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', radius - 50);

    path.attr('clip-path', 'url(#clip)');

    path.filter(d => d)
        .style('cursor', 'pointer')
        .call(sunburstMouseEvents);

    //separated clicked because you shouldn't be able to click on the last child
    path.filter(d => d.children)
        .on('click', clicked);

    const label = g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style('fill', 'white')
        .style('text-shadow', '1px 1px 1px rgba(0, 0, 0, 0.8)')
        .style('font-size', 14)
        .style("user-select", "none")
        .style('font-weight', 600)
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .classed('sunburst-text', true)
        .attr("dy", "0.35em")
        // .attr("fill-opacity", d => +labelVisible((d.depth === 1) ? d.current : 0))
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.name);

    //Allows the center of the circle to be clicked for zooming behavior
    const parent = g.append("circle")
        .datum(root)
        .classed('sunburst-center', true)
        .attr("r", zoomRad)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .style('cursor', 'pointer')
        .on("click", clicked);

    //Sets the title of the chart to the month name
    sunburstSvg.append('text')
        .classed('chart-title', true)
        .attr('id', 'sunburst-title')
        .attr('text-anchor', 'middle')
        .attr('opacity', 0)
        .attr('x', (w / 2))
        .attr('y', (margin.top / 2) + 15)
        .text(month)
        .transition()
        .duration(700)
        .attr('opacity', 1);

    function clicked(p) {
        parent.datum(p.parent || root);

        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });

        const t = g.transition().duration(750);

        path.transition(t)
            .tween("data", d => {
                const i = d3.interpolate(d.current, d.target);
                return t => d.current = i(t);
            })
            .filter(function (d) {
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
            })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.depth === 1 ? 0.8 : d.depth === 2 ? 0.7 : d.depth === 3 ? 0.45 : d.depth === 4 ? 0.25 : 0.25) : 0)
            .attrTween("d", d => () => arc(d.current));

        label.filter(function (d) {
                return +this.getAttribute("fill-opacity") || labelVisible(d.target);
            }).transition(t)
            // .attr("fill-opacity", d => +labelVisible((d.depth === 1) ? d.target : 0))
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
    }
}

function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
}

function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
}

function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * zoomRad;
    return `rotate(${x - 90}) translate(${y}, 0) rotate(${x < 180 ? 0 : 180})`;
}

function sunburstMouseEvents(selection, total) {
    selection
        .on('mouseover', function (d) {

            d3.select(this).classed('hovered', true); //makes the text appear

            //Creates the total percentage of the path selected
            //Prints the name of the selection with the percentage of the total hate crimes
            let percent = (100 * d.value / totalSize).toPrecision(3);
            nameLabel.text(() => {
                if (percent < 0.1) {
                    return `${d.name}\n < 0.1%`;
                } else {
                    return `${d.name}: ${percent}%`;
                }
            });

            textLength = d3.select('.nameLabel').node().getComputedTextLength();
            //Changes the font size based on the length of the text

            switch (true) {
                case textLength < 110:
                    nameLabel.style('font-size', '20px');
                    break;
                case textLength > 110 && textLength < 150:
                    nameLabel.style('font-size', '18px');
                    break;
                case textLength > 150 && textLength < 200:
                    nameLabel.style('font-size', '15px');
                    break;
                case textLength > 200 && textLength < 300:
                    nameLabel.style('font-size', '12px');
                    break;
                case textLength > 300:
                    nameLabel.style('font-size', '9px');
                    break;
                default:
                    nameLabel.style('font-size', '9px');
            }
        })
        .on('mouseout', function (d) {
            d3.select(this).classed('hovered', false);
            nameLabel.text("");
            if (d.depth != 1) {
                nameLabel.text("Click to Zoom Out");
            } else {
                nameLabel.text("");
            }

        });
}

function mouseEvents(selection) {
    //console.log('hovered');
    selection
        .on('mouseover', function (d) {
            d3.select(this)
                .style('cursor', 'pointer')
                .style('fill', '#2190CF');

        })
        .on('mouseout', function () {
            d3.select(this)
                .style('fill', '#003D71');

        })
        .on('click', function (d) {
            //console.log(currentDataset);
            let chosenMonth = filter(currentDataset, f => formatMonth(f.date) === d.month);
            //console.log(chosenMonth);

            fadeOut('rect');
            fadeOut('.numTotal')
            fadeOut('.axis');
            fadeOut('.axis-label');
            fadeOut('#bar-title');

            zoomableSunburst(chosenMonth, d.month);
            createLegend();
        });

}

//fades out the elements
const fadeOut = el => {
    d3.selectAll(el)
        .transition()
        .duration(800)
        .style('opacity', 0)
        .transition()
        .style('display', 'none');
}

//fades in the elements
const fadeIn = el => {
    d3.selectAll(el)
        .transition()
        .duration(800)
        .style('opacity', 1)
        .style('display', 'block');
}



//filtering
const filter = (data, rule) => {
    let filteredArr = data.reduce((acc, d) => {
        if (rule(d)) {
            return [
                ...acc,
                d
            ]
        } else {
            return acc;
        }

    }, []);

    return filteredArr;
}

window.onload = function () {
    d3.csv('csv/hate_crime-refined.csv', rowConverter)
        .then((dataset) => {
            //console.log(dataset);
            fullDataset = dataset;
            this.createInitialBarGraph(fullDataset);
        })

    stateChoice.addEventListener('change', () => {
        this.updateBarGraph(fullDataset);
    })

    backButton.addEventListener('click', () => {
        this.updateBarGraph(fullDataset);
    });
}