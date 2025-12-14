// --- 1. SETUP GLOBAL VARIABLES AND CROSSFILTER ---

const cf = crossfilter(rawData);
const recordCount = dc.dataCount("#stats-container");

// --- 2. DEFINE DIMENSIONS AND GROUPS ---

const yearDimension = cf.dimension(d => d.year);
const industryDimension = cf.dimension(d => d.industry);
const povertyDimension = cf.dimension(d => d.poverty_level);
const gdpDimension = cf.dimension(d => d.gdp);
const countryDimension = cf.dimension(d => d.country);


const yearGroup = yearDimension.group().reduceSum(d => d.incidents);
const industryGroup = industryDimension.group().reduceSum(d => d.incidents);
const povertyGroup = povertyDimension.group().reduceSum(d => d.incidents);
const countryGroup = countryDimension.group().reduceSum(d => d.incidents);

const gdpBins = [0, 0.5, 1.0, 2.0, 5.0, 20.0]; 
const gdpGroup = gdpDimension.group(d => {
    for (let i = 0; i < gdpBins.length; i++) {
        if (d < gdpBins[i]) {
            return `<${gdpBins[i]}B`;
        }
    }
    return `>20B`;
}).reduceSum(d => d.incidents);


// --- 3. CHART DEFINITIONS (DC.js) ---

// A. HISTORICAL TIME-SERIES LINE CHART
const historicalChart = dc.lineChart("#historical-chart");
historicalChart
    .width(document.getElementById("historical-chart-area").offsetWidth - 40)
    .height(300)
    .margins({ top: 10, right: 50, bottom: 40, left: 60 })
    .dimension(yearDimension)
    .group(yearGroup)
    .x(d3.scaleLinear().domain([2009.5, 2023.5]))
    .elasticY(true)
    .renderArea(true)
    .xAxisLabel("Year")
    .yAxisLabel("Total Incidents")
    .yAxisPadding(10000)
    .renderHorizontalGridLines(true)
    .brushOn(true); 

// B. INDUSTRY ROW CHART
const industryChart = dc.rowChart("#industry-chart");
industryChart
    .width(document.getElementById("industry-chart-area").offsetWidth - 40)
    .height(250)
    .margins({ top: 10, right: 10, bottom: 30, left: 10 })
    .dimension(industryDimension)
    .group(industryGroup)
    .elasticX(true)
    .colors(d3.scaleOrdinal(d3.schemeCategory10))
    .xAxis().ticks(4);

// C. POVERTY ROW CHART
const povertyChart = dc.rowChart("#poverty-chart");
povertyChart
    .width(document.getElementById("poverty-chart-area").offsetWidth - 40)
    .height(250)
    .margins({ top: 10, right: 10, bottom: 30, left: 10 })
    .dimension(povertyDimension)
    .group(povertyGroup)
    .ordering(d => -d.value) 
    .elasticX(true)
    .colors(d3.scaleOrdinal(d3.schemeAccent))
    .xAxis().ticks(4);

// D. GDP ROW CHART
const gdpChart = dc.rowChart("#gdp-chart");
gdpChart
    .width(document.getElementById("gdp-chart-area").offsetWidth - 40)
    .height(250)
    .margins({ top: 10, right: 10, bottom: 30, left: 10 })
    .dimension(gdpDimension)
    .group(gdpGroup)
    .ordering(d => d.key) 
    .elasticX(true)
    .colors(d3.scaleOrdinal(d3.schemeDark2))
    .xAxis().ticks(4);

// E. COUNTRY ROW CHART
const countryChart = dc.rowChart("#country-chart");
countryChart
    .width(document.getElementById("country-chart-area").offsetWidth - 40)
    .height(400) 
    .margins({ top: 10, right: 10, bottom: 30, left: 10 })
    .dimension(countryDimension)
    .group(countryGroup)
    .rowsCap(10) // Show top 10 countries
    .othersGrouper(false)
    .elasticX(true)
    .ordering(d => -d.value)
    .colors(d3.scaleOrdinal(d3.schemeSet3))
    .xAxis().ticks(4);

// F. INDUSTRY PIE CHART
const pieChart = dc.pieChart("#pie-chart");
pieChart
    .width(document.getElementById("pie-chart-area").offsetWidth - 40)
    .height(400)
    .innerRadius(50) 
    .externalLabels(20)
    .externalRadiusPadding(30)
    .dimension(industryDimension)
    .group(industryGroup)
    .colors(d3.scaleOrdinal(d3.schemeCategory10));

// G. DATA COUNT WIDGET
recordCount
    .crossfilter(cf)
    .groupAll(cf.groupAll())
    .html({
        some: 'Showing <span class="filter-count">%filter-count</span> out of <span class="total-count">%total-count</span> records.',
        all: 'Showing all <span class="total-count">%total-count</span> records.'
    });


// --- 4. CUSTOM TOOLTIP LOGIC ---

function attachCustomTooltips(chart, tooltipContent) {
    const tooltip = d3.select("#chart-tooltip");

    chart.on('pretransition.tooltip', function(chart) {
        // Target rows for row charts or slices for pie charts
        const targets = chart.selectAll('g.row, g.pie-slice');

        targets
            .on('mouseover', function(event, d) {
                // Determine if it's a row chart or pie chart event data
                const data = d.data || d; 
                
                tooltip.style('opacity', 1);
                
                tooltip.html(tooltipContent(data))
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");

                // Highlight effect (only apply to row charts here for simplicity, pie charts handled differently)
                if (d3.select(this).select('rect').node()) {
                    d3.select(this).select('rect').attr('fill', '#ff9900'); 
                }
            })
            .on('mousemove', function(event) {
                 tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
            })
            .on('mouseout', function(event, d) {
                tooltip.style('opacity', 0);
                
                // Reset color for row charts
                if (d3.select(this).select('rect').node()) {
                    const originalColor = chart.getColor(d, d.key);
                    d3.select(this).select('rect').attr('fill', originalColor);
                }
            });
    });
}

// 5. APPLY TOOLTIPS AND RENDER ALL CHARTS

// Industry Row Chart Tooltip Content
attachCustomTooltips(industryChart, function(d) {
    const rawIncidents = d3.format(',')(d.value);
    return `<strong>Industry:</strong> ${d.key}<br>
            <strong>Total Incidents:</strong> ${rawIncidents}<br>
            <span style="font-size: 0.8em; color: #ccc;">(Click bar to filter)</span>`;
});

// Poverty Chart Tooltip Content
attachCustomTooltips(povertyChart, function(d) {
    const rawIncidents = d3.format(',')(d.value);
    return `<strong>Poverty Level:</strong> ${d.key}<br>
            <strong>Incidents:</strong> ${rawIncidents}<br>
            <span style="font-size: 0.8em; color: #ccc;">(Click bar to filter)</span>`;
});

// GDP Chart Tooltip Content
attachCustomTooltips(gdpChart, function(d) {
    const rawIncidents = d3.format(',')(d.value);
    return `<strong>GDP Bin:</strong> ${d.key}<br>
            <strong>Incidents:</strong> ${rawIncidents}<br>
            <span style="font-size: 0.8em; color: #ccc;">(Click bar to filter)</span>`;
});

// Country Chart Tooltip Content
attachCustomTooltips(countryChart, function(d) {
    const rawIncidents = d3.format(',')(d.value);
    return `<strong>Country:</strong> ${d.key}<br>
            <strong>Incidents:</strong> ${rawIncidents}<br>
            <span style="font-size: 0.8em; color: #ccc;">(Click bar to filter)</span>`;
});

// Pie Chart Tooltip Content (Uses d.data format)
pieChart.on('pretransition.tooltip', function(chart) {
    const tooltip = d3.select("#chart-tooltip");
    
    chart.selectAll('g.pie-slice')
        .on('mouseover', function(event, d) {
            const data = d.data;
            const percentage = d3.format('.1%')(data.value / chart.group().all().reduce((sum, item) => sum + item.value, 0));
            
            tooltip.style('opacity', 1);
            tooltip.html(`<strong>Industry:</strong> ${data.key}<br>
                          <strong>Share:</strong> ${percentage}<br>
                          <span style="font-size: 0.8em; color: #ccc;">(Click slice to filter)</span>`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on('mousemove', function(event) {
             tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0);
        });
});

// RENDER ALL CHARTS
dc.renderAll();