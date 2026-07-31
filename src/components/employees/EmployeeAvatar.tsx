import { useEffect, useState } from "react";
import { DEFAULT_AVATAR_URL } from "../../constants/defaults";
import { buildNamedAvatarUrl } from "../../services/employees/employee.mapper";

type EmployeeAvatarProps = {
  src?: string | null;
  name?: string;
  alt?: string;
  className?: string;
};

/** Avatar image with named fallback when the remote file fails to load. */
export function EmployeeAvatar({
  src,
  name,
  alt = "",
  className,
}: EmployeeAvatarProps) {
  const fallback = name ? buildNamedAvatarUrl(name) : DEFAULT_AVATAR_URL;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolved = !src || failed ? fallback : src;

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
