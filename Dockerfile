FROM node:18

# Set the working directory to the current directory
WORKDIR .

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environmental variables
ENV ADDRESS=address \
    PEERS=peers \
    PORT=port

# Start the application
CMD npm start