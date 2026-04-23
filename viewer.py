"""
3D structure viewer using py3Dmol embedded in Streamlit.

Highlights the mutant residue in red, colors the rest by secondary structure.
"""

import streamlit as st


def render_structure(
    pdb_text: str,
    highlight_residue: int | None = None,
    height: int = 500,
) -> None:
    """
    Render a PDB structure in the Streamlit app using py3Dmol (via CDN).

    Args:
        pdb_text: Raw PDB file content as a string.
        highlight_residue: 1-indexed residue position to highlight in red.
        height: Viewer height in pixels.
    """
    # Escape backticks and backslashes for safe JS injection
    safe_pdb = pdb_text.replace("\\", "\\\\").replace("`", "\\`")

    highlight_js = ""
    if highlight_residue is not None:
        highlight_js = f"""
        viewer.addStyle(
            {{resi: {highlight_residue}}},
            {{sphere: {{color: 'red', radius: 1.2}}, stick: {{color: 'red', radius: 0.3}}}}
        );
        // Add a label
        viewer.addLabel(
            'Variant site\\nResidue {highlight_residue}',
            {{
                position: {{resi: {highlight_residue}}},
                backgroundColor: 'darkred',
                fontColor: 'white',
                fontSize: 12,
                borderThickness: 0,
                backgroundOpacity: 0.8,
            }}
        );
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <script src="https://3dmol.org/build/3Dmol-min.js"></script>
        <style>
            body {{ margin: 0; background: #0e1117; }}
            #viewer {{ width: 100%; height: {height}px; position: relative; }}
        </style>
    </head>
    <body>
        <div id="viewer"></div>
        <script>
            $(function() {{
                let viewer = $3Dmol.createViewer('viewer', {{
                    backgroundColor: '0x0e1117',
                    antialias: true,
                }});

                let pdb = `{safe_pdb}`;
                viewer.addModel(pdb, 'pdb');

                // Base style: cartoon colored by secondary structure
                viewer.setStyle({{}}, {{
                    cartoon: {{
                        colorscheme: 'ssJmol',
                        opacity: 0.85,
                    }}
                }});

                {highlight_js}

                viewer.zoomTo();
                viewer.spin('y', 0.5);
                viewer.render();
            }});
        </script>
    </body>
    </html>
    """

    st.iframe(html, height=height)


def render_placeholder(height: int = 500) -> None:
    """Render an empty placeholder before a structure is loaded."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                margin: 0;
                background: #0e1117;
                display: flex;
                align-items: center;
                justify-content: center;
                height: {height}px;
                color: #555;
                font-family: sans-serif;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div>Enter a gene and variant to load the 3D structure</div>
    </body>
    </html>
    """
    st.iframe(html, height=height)
