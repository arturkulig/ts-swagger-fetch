export function getInterfaceName(input: string) {
  const lettersAndNumbers = input.replace(/[^a-zA-Z0-9]/g, '');
  return `${lettersAndNumbers[0].toUpperCase()}${lettersAndNumbers.slice(1)}`;
}
