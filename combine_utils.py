import os

def combine_files():
    # Read contents of Utils.gs
    with open('Utils.gs', 'r') as utils_file:
        utils_content = utils_file.read()
    
    # Read contents of Utils_Main.gs
    with open('Utils_Main.gs', 'r') as main_file:
        main_content = main_file.read()
    
    # Combine contents - keep the import statements from Utils_Main.gs
    # and add the function implementations from Utils.gs
    combined_content = main_content.split('// Export all functions directly')[0] + '\n// Export all functions directly\n' + utils_content
    
    # Write to Utils_Main.gs
    with open('Utils_Main.gs', 'w') as main_file:
        main_file.write(combined_content)
    
    # Remove the old Utils.gs file
    os.remove('Utils.gs')

combine_files()
