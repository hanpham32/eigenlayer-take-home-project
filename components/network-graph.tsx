"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const NetworkGraph = ({jsonData}) => {
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Parse the data from the JSON
    const fetchData = async () => {
      try {
        setLoading(true);
        // Process the data to ensure all referenced nodes exist
        const processedData = processData(jsonData);
        setData(processedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(`Failed to load or process data: ${error.message}`);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Process data to ensure all nodes referenced in relationships exist
  const processData = (rawData) => {
    // Make a deep copy to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(rawData));
    
    // Get all existing entity names
    const entityNames = new Set(processedData.entities.map(entity => entity.name));
    
    // Find all nodes referenced in relationships
    const allReferencedNodes = new Set();
    processedData.relationships.forEach(rel => {
      allReferencedNodes.add(rel.source);
      allReferencedNodes.add(rel.target);
    });
    
    // Identify missing nodes
    const missingNodes = Array.from(allReferencedNodes).filter(node => !entityNames.has(node));
    
    // Map for determining entity types
    const entityTypeMap = {
      "Blockchain": "data structure",
      "Network": "infrastructure",
      "Consensus": "protocol mechanism",
      "Incentive (block reward)": "protocol mechanism",
      "Disk pruning": "technique",
      "Simplified Payment Verification": "technique",
      "Block headers": "data structure",
      "Privacy": "concept",
      "Public keys": "cryptographic primitive",
    };
    
    // Add missing nodes
    missingNodes.forEach(node => {
      const type = entityTypeMap[node] || "concept";
      processedData.entities.push({
        name: node,
        type: type
      });
    });
    
    return processedData;
  };
  
  // Render the graph whenever the data changes
  useEffect(() => {
    if (data) {
      renderGraph(data);
    }
  }, [data]);
  
  const renderGraph = (data) => {
    if (!data || !svgRef.current) return;
    
    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Extract entities and relationships
    const entities = data.entities;
    const relationships = data.relationships;
    
    // Set up the SVG dimensions
    const width = 800;
    const height = 600;
    
    // Create the SVG element and append it to the container
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");
    
    // Add a background for better visibility
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#f8f9fa");
      
    // Set up the simulation
    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30)) // Prevent node overlap
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));
    
    // Create a container for the graph that can be transformed
    const graph = svg.append("g");
    
    // Prepare the data for D3
    const nodes = entities.map(entity => ({
      id: entity.name,
      name: entity.name,
      type: entity.type,
      radius: ["Bitcoin", "Proof-of-Work", "Blockchain"].includes(entity.name) ? 15 : 10
    }));
    
    const links = relationships.map(rel => ({
      source: rel.source,
      target: rel.target,
      type: rel.type
    }));
    
    // Create the color scale based on entity types
    const entityTypes = [...new Set(entities.map(e => e.type))];
    const colorScale = d3.scaleOrdinal()
      .domain(entityTypes)
      .range(d3.schemeCategory10);
    
    // Create the relationship lines
    const link = graph.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);
    
    // Create groups for each node
    const node = graph.append("g")
      .attr("class", "nodes")
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => colorScale(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
    
    // Add labels to nodes
    node.append("text")
      .attr("dy", 4)
      .attr("dx", d => d.radius + 5)
      .text(d => d.name)
      .attr("font-size", d => d.radius > 10 ? "12px" : "10px")
      .attr("font-weight", d => d.radius > 10 ? "bold" : "normal")
      .attr("font-family", "sans-serif");
    
    // Add titles for tooltips
    node.append("title")
      .text(d => `${d.name} (${d.type})`);
    
    // Add relationship labels (with improved positioning)
    const linkLabels = graph.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("font-size", "8px")
      .attr("font-family", "sans-serif")
      .attr("fill", "#666")
      .attr("text-anchor", "middle")
      .text(d => d.type);
    
    // Add interactive highlighting
    node
      .on("mouseover", function(event, d) {
        // Highlight connected links
        link
          .attr("stroke", l => 
            l.source.id === d.id || l.target.id === d.id ? "#ff6600" : "#999")
          .attr("stroke-width", l => 
            l.source.id === d.id || l.target.id === d.id ? 3 : 1.5)
          .attr("stroke-opacity", l => 
            l.source.id === d.id || l.target.id === d.id ? 1 : 0.3);
            
        // Highlight this node
        d3.select(this).select("circle")
          .attr("stroke", "#ff6600")
          .attr("stroke-width", 3);
          
        // Highlight link labels of connected links
        linkLabels
          .attr("font-weight", l => 
            l.source.id === d.id || l.target.id === d.id ? "bold" : "normal")
          .attr("fill", l => 
            l.source.id === d.id || l.target.id === d.id ? "#ff6600" : "#666")
          .attr("font-size", l => 
            l.source.id === d.id || l.target.id === d.id ? "10px" : "8px");
      })
      .on("mouseout", function() {
        // Reset link appearance
        link
          .attr("stroke", "#999")
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6);
          
        // Reset node appearance
        d3.select(this).select("circle")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
          
        // Reset link label appearance
        linkLabels
          .attr("font-weight", "normal")
          .attr("fill", "#666")
          .attr("font-size", "8px");
      });
    
    // Set up the simulation tick function
    simulation
      .nodes(nodes)
      .on("tick", ticked);
    
    simulation.force("link")
      .links(links);
    
    // Add zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        graph.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(20, 20)");
    
    entityTypes.forEach((type, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
        
      legendRow.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", colorScale(type));
        
      legendRow.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .attr("font-size", "10px")
        .attr("font-family", "sans-serif")
        .text(type);
    });
    
    // Add reset zoom button
    const resetButton = svg.append("g")
      .attr("class", "reset-button")
      .attr("transform", `translate(${width - 100}, 20)`)
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      });
      
    resetButton.append("rect")
      .attr("width", 80)
      .attr("height", 25)
      .attr("rx", 5)
      .attr("fill", "#eee")
      .attr("stroke", "#999");
      
    resetButton.append("text")
      .attr("x", 40)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-family", "sans-serif")
      .text("Reset View");
    
    // Functions for handling the dragging behavior
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Update positions on each tick of the simulation
    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);
      
      linkLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="w-full h-[600px] border border-gray-300 rounded-lg flex items-center justify-center bg-white">
          <div className="text-xl">Loading visualization...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="w-full p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full h-[600px] border border-gray-300 rounded-lg overflow-hidden bg-white">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
      <div className="mt-4 text-gray-600 text-sm">
        <p>Visualization of entities and relationships from Satoshi Nakamoto's Bitcoin whitepaper.</p>
        <ul className="list-disc ml-5 mt-2">
          <li>Drag nodes to rearrange the network</li>
          <li>Scroll to zoom in/out</li>
          <li>Hover over nodes to highlight connections</li>
          <li>Click 'Reset View' to restore the original view</li>
        </ul>
      </div>
    </div>
  );
};

export default NetworkGraph;
