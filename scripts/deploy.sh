#!/bin/sh

# Read .env file
for i in $(egrep -v '^#|^$' .env); do
    export $i
done

# check ADMIN_ADRESS exists
if [ -z ${ADMIN_ADDRESS+x} ]; then
    echo "ADMIN_ADDRESS is not setted"
    exit 1
fi

# check OWNER_ADDRESS exists
if [ -z ${OWNER_ADDRESS+x} ]; then
    echo "OWNER_ADDRESS is not setted";
    exit 1
fi

# Compile all files again
echo "> ./node_modules/.bin/truffle compile --all"
./node_modules/.bin/truffle compile --all

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

# Push contracts
echo "> zos push --network deploy --from $ADMIN_ADDRESS"
./node_modules/.bin/zos push --network deploy --from $ADMIN_ADDRESS

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

# Create Exchange
echo "> zos create Exchange --init initialize --args $OWNER_ADDRESS --network deploy --from $ADMIN_ADDRESS"
./node_modules/.bin/zos create Exchange --init initialize --args $OWNER_ADDRESS --network deploy --from $ADMIN_ADDRESS

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

# Create ERC20Proxy
echo "> zos create ERC20Proxy --network deploy --from $ADMIN_ADDRESS"
./node_modules/.bin/zos create ERC20Proxy --network deploy --from $ADMIN_ADDRESS

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

# Create ERC721Proxy
echo "> zos create ERC721Proxy --network deploy --from $ADMIN_ADDRESS"
./node_modules/.bin/zos create ERC721Proxy --network deploy --from $ADMIN_ADDRESS

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi
